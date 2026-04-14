import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { INexusEvent } from '../../common/interfaces/event.interface';
import { getCurrentTenantId } from '../../core/tenant/tenant-context';
import { QueueService } from '../../infra/queue/queue.service';
import { TenantRedisService } from '../../infra/redis/tenant-redis.service';
import { TenantRepository } from '../../core/tenant/tenant.repository';
import { runWithTenant } from '../../core/tenant/tenant-context';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('REDIS_PUBSUB_PUBLISHER') private readonly redisPub: Redis,
    private readonly queueService: QueueService,
    private readonly tenantRedisService: TenantRedisService,
    private readonly tenantRepository: TenantRepository,
  ) {}

  async emit(eventType: string, payload: Record<string, any>, source: string = 'system'): Promise<INexusEvent> {
    const tenantId = getCurrentTenantId();
    
    const event: INexusEvent = {
      eventId: uuidv4(),
      tenantId,
      eventType,
      source,
      timestamp: Date.now(),
      payload,
    };

    this.eventEmitter.emit(eventType, event);
    this.eventEmitter.emit('*', event);

    await this.redisPub.publish(`nexus:events:tenant:${tenantId}`, JSON.stringify(event));

    await this.queueService.addEventJob(event);

    const streamKey = this.tenantRedisService.getEventStreamKey();
    await this.tenantRedisService.lpush('events:stream', JSON.stringify(event));
    await this.tenantRedisService.ltrim('events:stream', 0, 999);

    const counterKey = this.tenantRedisService.getCounterKey(eventType);
    await this.tenantRedisService.incr(counterKey);

    this.logger.log(`Event emitted: ${eventType} for tenant ${tenantId}`);

    return event;
  }

  async emitToAllTenants(eventType: string, payload: Record<string, any>): Promise<void> {
    const tenants = await this.tenantRepository.findAllActive();
    
    for (const tenant of tenants) {
      await runWithTenant(tenant.id, async () => {
        await this.emit(eventType, payload, 'system-broadcast');
      });
    }
  }
}
