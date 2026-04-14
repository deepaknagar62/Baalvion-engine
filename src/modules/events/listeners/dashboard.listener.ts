import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as eventInterface from '../../../common/interfaces/event.interface';
import { QueueService } from '../../../infra/queue/queue.service';
import { TenantRedisService } from '../../../infra/redis/tenant-redis.service';
import { runWithTenant } from '../../../core/tenant/tenant-context';

@Injectable()
export class DashboardListener {
  private readonly logger = new Logger(DashboardListener.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly tenantRedisService: TenantRedisService,
  ) {}

  @OnEvent('*')
  async handleAllEvents(event: eventInterface.INexusEvent) {
    await runWithTenant(event.tenantId, async () => {
      await this.queueService.addDashboardUpdate(
        {
          event: event.eventType,
          timestamp: event.timestamp,
          payload: event.payload,
        },
        event.tenantId,
      );

      const activityKey = 'activity:stream';
      await this.tenantRedisService.lpush(activityKey, JSON.stringify({
        eventType: event.eventType,
        timestamp: event.timestamp,
        source: event.source,
      }));
      await this.tenantRedisService.ltrim(activityKey, 0, 99);
    });
  }
}
