import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { JobOptions } from 'bull';
import { INexusEvent } from '../../common/interfaces/event.interface';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('notification:email') private emailQueue: Queue,
    @InjectQueue('notification:sms') private smsQueue: Queue,
    @InjectQueue('notification:push') private pushQueue: Queue,
    @InjectQueue('notification:inapp') private inappQueue: Queue,
    @InjectQueue('events:processing') private eventsQueue: Queue,
    @InjectQueue('dashboard:updates') private dashboardQueue: Queue,
  ) {}

  async addEmailJob(data: any, tenantId: string, opts?: JobOptions): Promise<void> {
    await this.emailQueue.add('send', { ...data, tenantId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      ...opts,
    });
  }

  async addSmsJob(data: any, tenantId: string, opts?: JobOptions): Promise<void> {
    await this.smsQueue.add('send', { ...data, tenantId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      ...opts,
    });
  }

  async addPushJob(data: any, tenantId: string, opts?: JobOptions): Promise<void> {
    await this.pushQueue.add('send', { ...data, tenantId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      ...opts,
    });
  }

  async addInAppJob(data: any, tenantId: string, opts?: JobOptions): Promise<void> {
    await this.inappQueue.add('send', { ...data, tenantId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      ...opts,
    });
  }

  async addEventJob(event: INexusEvent, opts?: JobOptions): Promise<void> {
    await this.eventsQueue.add('process', event, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 1000 },
      ...opts,
    });
  }

  async addDashboardUpdate(data: any, tenantId: string): Promise<void> {
    await this.dashboardQueue.add('update', { ...data, tenantId }, {
      attempts: 1,
      removeOnComplete: true,
    });
  }

  private getQueue(queueName: string): Queue | null {
    switch (queueName) {
      case 'notification:email':
        return this.emailQueue;
      case 'notification:sms':
        return this.smsQueue;
      case 'notification:push':
        return this.pushQueue;
      case 'notification:inapp':
        return this.inappQueue;
      case 'events:processing':
        return this.eventsQueue;
      case 'dashboard:updates':
        return this.dashboardQueue;
      default:
        return null;
    }
  }

  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  } | null> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      return null;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async getJobById(queueName: string, jobId: string): Promise<any> {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      return null;
    }

    return queue.getJob(jobId);
  }
}
