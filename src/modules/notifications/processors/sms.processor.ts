import { Processor, Process } from '@nestjs/bull';
import bull from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus } from '../notification.entity';
import { SmsProvider } from '../providers/sms.provider';
import { EventBusService } from '../../events/event-bus.service';
import { runWithTenant } from '../../../core/tenant/tenant-context';
import { TenantRedisService } from '../../../infra/redis/tenant-redis.service';

@Processor('notification:sms')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly smsProvider: SmsProvider,
    private readonly eventBusService: EventBusService,
    private readonly tenantRedisService: TenantRedisService,
  ) {}

  @Process('send')
  async handleSendSms(job: bull.Job) {
    const { tenantId, notificationId, recipient, body } = job.data;

    await runWithTenant(tenantId, async () => {
      try {
        const dedupKey = `notif:dedup:${notificationId}`;
        const alreadyProcessed = !(await this.tenantRedisService.setNX(dedupKey, '1', 3600));

        if (alreadyProcessed) {
          this.logger.log(`SMS notification ${notificationId} already processed, skipping`);
          return;
        }

        this.logger.log(`Sending SMS to ${recipient} for tenant ${tenantId}`);

        const result = await this.smsProvider.send(recipient, body);

        if (notificationId) {
          await this.notificationRepository.update(
            { id: notificationId, tenantId },
            {
              status: NotificationStatus.SENT,
              sentAt: new Date(),
              attempts: () => 'attempts + 1',
              lastAttemptAt: new Date(),
            },
          );
        }

        await this.eventBusService.emit('notification.sent', {
          notificationId,
          channel: 'sms',
          recipient,
          sid: result.sid,
        });

        this.logger.log(`SMS sent successfully to ${recipient}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to send SMS to ${recipient}: ${errorMessage}`);

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

        await this.eventBusService.emit('notification.failed', {
          notificationId,
          channel: 'sms',
          recipient,
          error: errorMessage,
        });

        throw error;
      }
    });
  }
}
