import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationChannel, NotificationStatus } from './notification.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import { QueueService } from '../../infra/queue/queue.service';
import { getCurrentTenantId } from '../../core/tenant/tenant-context';
import { TenantRedisService } from '../../infra/redis/tenant-redis.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly queueService: QueueService,
    private readonly tenantRedisService: TenantRedisService,
  ) {}

  async send(dto: SendNotificationDto): Promise<Notification> {
    const tenantId = getCurrentTenantId();
    const notificationId = uuidv4();

    const notification = this.notificationRepository.create({
      id: notificationId,
      tenantId,
      userId: dto.userId,
      channel: dto.channel as NotificationChannel,
      status: NotificationStatus.PENDING,
      subject: dto.subject,
      body: dto.body,
      recipient: dto.recipient,
      metadata: dto.metadata,
    });

    await this.notificationRepository.save(notification);

    const jobData = {
      tenantId,
      notificationId,
      recipient: dto.recipient,
      subject: dto.subject,
      body: dto.body,
      userId: dto.userId,
      metadata: dto.metadata,
    };

    switch (dto.channel) {
      case 'email':
        await this.queueService.addEmailJob(jobData, tenantId);
        break;
      case 'sms':
        await this.queueService.addSmsJob(jobData, tenantId);
        break;
      case 'push':
        await this.queueService.addPushJob(jobData, tenantId);
        break;
      case 'inapp':
        await this.queueService.addInAppJob(jobData, tenantId);
        break;
    }

    return notification;
  }

  async sendBulk(dtos: SendNotificationDto[]): Promise<Notification[]> {
    const notifications = await Promise.all(dtos.map(dto => this.send(dto)));
    return notifications;
  }

  async getNotificationsForUser(userId: string, page: number = 1, limit: number = 50): Promise<{ notifications: Notification[]; total: number }> {
    const tenantId = getCurrentTenantId();
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { tenantId, userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { notifications, total };
  }

  async getInAppNotifications(userId: string): Promise<any[]> {
    const userNotifKey = `notifications:${userId}`;
    const notifications = await this.tenantRedisService.lrange(userNotifKey, 0, 49);
    return notifications.map(n => JSON.parse(n));
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const tenantId = getCurrentTenantId();
    
    await this.notificationRepository.update(
      { id: notificationId, tenantId, userId },
      { status: NotificationStatus.DELIVERED },
    );

    const unreadKey = `notif:unread:${userId}`;
    const count = await this.tenantRedisService.get(unreadKey);
    if (count && parseInt(count, 10) > 0) {
      await this.tenantRedisService.set(unreadKey, (parseInt(count, 10) - 1).toString());
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const unreadKey = `notif:unread:${userId}`;
    const count = await this.tenantRedisService.get(unreadKey);
    return count ? parseInt(count, 10) : 0;
  }

  async getDeliveryStats(): Promise<any> {
    const tenantId = getCurrentTenantId();

    const stats = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.channel', 'channel')
      .addSelect('notification.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('notification.tenantId = :tenantId', { tenantId })
      .groupBy('notification.channel')
      .addGroupBy('notification.status')
      .getRawMany();

    return stats;
  }

  async retryFailed(notificationId: string): Promise<void> {
    const tenantId = getCurrentTenantId();
    
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, tenantId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    const jobData = {
      tenantId,
      notificationId: notification.id,
      recipient: notification.recipient,
      subject: notification.subject,
      body: notification.body,
      userId: notification.userId,
      metadata: notification.metadata,
    };

    switch (notification.channel) {
      case NotificationChannel.EMAIL:
        await this.queueService.addEmailJob(jobData, tenantId);
        break;
      case NotificationChannel.SMS:
        await this.queueService.addSmsJob(jobData, tenantId);
        break;
      case NotificationChannel.PUSH:
        await this.queueService.addPushJob(jobData, tenantId);
        break;
      case NotificationChannel.INAPP:
        await this.queueService.addInAppJob(jobData, tenantId);
        break;
    }
  }
}
