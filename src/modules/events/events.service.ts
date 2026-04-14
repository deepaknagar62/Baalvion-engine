import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Event } from './event.entity';
import { EventBusService } from './event-bus.service';
import { EmitEventDto } from './dto/emit-event.dto';
import { INexusEvent } from '../../common/interfaces/event.interface';
import { TenantRedisService } from '../../infra/redis/tenant-redis.service';
import { getCurrentTenantId } from '../../core/tenant/tenant-context';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly eventBusService: EventBusService,
    private readonly tenantRedisService: TenantRedisService,
  ) {}

  async emit(dto: EmitEventDto, source: string = 'api'): Promise<INexusEvent> {
    const event = await this.eventBusService.emit(dto.eventType, dto.payload, source);
    
    const tenantId = getCurrentTenantId();
    await this.eventRepository.save({
      tenantId,
      eventId: event.eventId,
      eventType: event.eventType,
      source: event.source,
      timestamp: event.timestamp,
      payload: event.payload,
      metadata: dto.metadata,
      processed: false,
    });

    return event;
  }

  async getRecentEvents(limit: number = 50): Promise<INexusEvent[]> {
    const events = await this.tenantRedisService.lrange('events:stream', 0, limit - 1);
    return events.map(e => JSON.parse(e));
  }

  async getEventHistory(filters: {
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ events: Event[]; total: number }> {
    const tenantId = getCurrentTenantId();
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.startDate && filters.endDate) {
      where.timestamp = Between(filters.startDate.getTime(), filters.endDate.getTime());
    }

    const [events, total] = await this.eventRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      skip,
      take: limit,
    });

    return { events, total };
  }

  async getEventStats(): Promise<Record<string, number>> {
    const tenantId = getCurrentTenantId();
    const pattern = `tenant:${tenantId}:counter:*`;
    const keys = await this.tenantRedisService['redisService'].keys(pattern);
    
    const stats: Record<string, number> = {};
    
    for (const key of keys) {
      const value = await this.tenantRedisService['redisService'].get(key);
      const eventType = key.split(':').pop() || 'unknown';
      stats[eventType] = parseInt(value || '0', 10);
    }

    return stats;
  }

  async markProcessed(eventId: string): Promise<void> {
    const tenantId = getCurrentTenantId();
    await this.eventRepository.update(
      { eventId, tenantId },
      { processed: true },
    );
  }
}
