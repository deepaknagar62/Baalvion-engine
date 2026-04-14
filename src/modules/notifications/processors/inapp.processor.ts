import { Processor, Process } from '@nestjs/bull';
import bull from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus } from '../notification.entity';
import { EventBusService } from '../../events/event-bus.service';
import { runWithTenant } from '../../../core/tenant/tenant-context';
import { TenantRedisService } from '../../../infra/redis/tenant-redis.service';

@Processor('notification:inapp')
export class InAppProcessor {
  private readonly logger = new Logger(InAppProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly eventBusService: EventBusService,
    private readonly tenantRedisService: TenantRedisService,
  ) {}

  @Process('send')
  async handleSendInApp(job: bull.Job) {
    const { tenantId, notificationId, recipient, subject, body, userId } = job.data;

    await runWithTenant(tenantId, async () => {
      try {
        this.logger.log(`Storing in-app notification for user ${userId} in tenant ${tenantId}`);

        const notificationData = {
          id: notificationId,
          subject,
          body,
          timestamp: Date.now(),
          read: false,
        };

        const userNotifKey = `notifications:${userId}`;
        await this.tenantRedisService.lpush(userNotifKey, JSON.stringify(notificationData));
        await this.tenantRedisService.ltrim(userNotifKey, 0, 99);

        if (notificationId) {
          await this.notificationRepository.update(
            { id: notificationId, tenantId },
            {
              status: NotificationStatus.DELIVERED,
              sentAt: new Date(),
              attempts: () => 'attempts + 1',
              lastAttemptAt: new Date(),
            },
          );
        }

        const unreadKey = `notif:unread:${userId}`;
        await this.tenantRedisService.incr(unreadKey);

        await this.eventBusService.emit('notification.inapp', {
          notificationId,
          userId,
          subject,
          body,
        });

        await this.eventBusService.emit('notification.sent', {
          notificationId,
          channel: 'inapp',
          recipient: userId,
        });

        this.logger.log(`In-app notification stored for user ${userId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to store in-app notification for user ${userId}: ${errorMessage}`);

        if (notificationId) {
          await this.notificationRepository.update(
            { id: notificationId, tenantId },
            {
              status: NotificationStatus.FAILED,
              errorMessage,
              attempts: () => 'attempts + 1',
              lastAttemptAt: new Date(),
            },
          );
        }

        throw error;
      }
    });
  }
}
