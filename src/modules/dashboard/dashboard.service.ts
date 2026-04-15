import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { RealtimeService } from '../realtime/realtime.service';
import { QueueService } from '../../infra/queue/queue.service';
import { TenantRedisService } from '../../infra/redis/tenant-redis.service';
import { TenantRepository } from '../../core/tenant/tenant.repository';
import { runWithTenant } from '../../core/tenant/tenant-context';
import Redis from 'ioredis';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private metricsInterval: NodeJS.Timeout;

  constructor(
    private readonly eventsService: EventsService,
    private readonly realtimeService: RealtimeService,
    private readonly queueService: QueueService,
    private readonly tenantRedisService: TenantRedisService,
    private readonly tenantRepository: TenantRepository,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async getSnapshot(tenantId: string): Promise<any> {
    return runWithTenant(tenantId, async () => {
      const [recentEvents, counters, connectedUsers, queueStats] = await Promise.all([
        this.eventsService.getRecentEvents(50),
        this.eventsService.getEventStats(),
        this.realtimeService.getConnectionCount(tenantId),
        this.getQueueDepths(),
      ]);

      return {
        recentEvents,
        counters,
        connectedUsers,
        queueStats,
        timestamp: Date.now(),
      };
    });
  }

  async getGlobalSnapshot(): Promise<any> {
    const tenants = await this.tenantRepository.findAllActive();
    
    const snapshots = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const snapshot = await this.getSnapshot(tenant.id);
          return {
            tenantId: tenant.id,
            tenantName: tenant.name,
            ...snapshot,
          };
        } catch (error) {
          this.logger.error(`Failed to get snapshot for tenant ${tenant.id}: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      }),
    );

    return {
      tenants: snapshots.filter(s => s !== null),
      timestamp: Date.now(),
    };
  }

  async pushActivityUpdate(tenantId: string, event: any) {
    await runWithTenant(tenantId, async () => {
      const activityKey = 'activity:stream';
      await this.tenantRedisService.lpush(activityKey, JSON.stringify(event));
      await this.tenantRedisService.ltrim(activityKey, 0, 99);
    });
  }

  async getLiveCounters(tenantId: string): Promise<Record<string, number>> {
    return runWithTenant(tenantId, async () => {
      return this.eventsService.getEventStats();
    });
  }

  async getQueueDepths(): Promise<any> {
    const queues = [
      'notification:email',
      'notification:sms',
      'notification:push',
      'notification:inapp',
      'events:processing',
      'dashboard:updates',
    ];

    const stats = await Promise.all(
      queues.map(async (queueName) => {
        const queueStats = await this.queueService.getQueueStats(queueName);
        return { queue: queueName, ...queueStats };
      }),
    );

    return stats;
  }

  startMetricsBroadcast() {
    this.metricsInterval = setInterval(async () => {
      try {
        const tenants = await this.tenantRepository.findAllActive();
        
        for (const tenant of tenants) {
          const snapshot = await this.getSnapshot(tenant.id);
          // Broadcast to dashboard gateway would happen here
          this.logger.debug(`Metrics broadcast for tenant ${tenant.id}`);
        }
      } catch (error) {
        this.logger.error(`Metrics broadcast error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 5000);
  }

  stopMetricsBroadcast() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  async getSystemHealth(): Promise<any> {
    const redisConnected = this.redis.status === 'ready';
    
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      redisConnected,
      dbConnected: true,
      nodeVersion: process.version,
      timestamp: Date.now(),
    };
  }
}
