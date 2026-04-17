import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as eventInterface from '../../../common/interfaces/event.interface';
import { QueueService } from '../../../infra/queue/queue.service';
import { runWithTenant } from '../../../core/tenant/tenant-context';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(private readonly queueService: QueueService) {}

  @OnEvent('user.signup')
  async handleUserSignup(event: eventInterface.INexusEvent) {
    await runWithTenant(event.tenantId, async () => {
      this.logger.log(`Handling user.signup event for tenant ${event.tenantId}`);
      
      await this.queueService.addEmailJob(
        {
          recipient: event.payload.email,
          subject: 'Welcome to Baalvion!',
          body: `Hi ${event.payload.name || 'there'}, welcome to our platform!`,
          userId: event.payload.userId,
        },
        event.tenantId,
      );
    });
  }

  @OnEvent('user.login')
  async handleUserLogin(event: eventInterface.INexusEvent) {
    await runWithTenant(event.tenantId, async () => {
      this.logger.log(`User login event for tenant ${event.tenantId}`);

      if (!event.payload.userId) return;

      await this.queueService.addInAppJob(
        {
          recipient: event.payload.userId,
          subject: 'Login Successful',
          body: `Welcome back, ${event.payload.name || event.payload.email}! You have successfully logged in.`,
          userId: event.payload.userId,
        },
        event.tenantId,
      );

      await this.queueService.addEmailJob(
        {
          recipient: event.payload.email,
          subject: 'Login Successful',
          body: `Hi ${event.payload.name || 'there'}, you have successfully logged in to your account.`,
          userId: event.payload.userId,
        },
        event.tenantId,
      );
    });
  }

  @OnEvent('system.error')
  async handleSystemError(event: eventInterface.INexusEvent) {
    await runWithTenant(event.tenantId, async () => {
      this.logger.error(`System error for tenant ${event.tenantId}: ${JSON.stringify(event.payload)}`);
      
      await this.queueService.addEmailJob(
        {
          recipient: 'admin@baalvion.com',
          subject: 'System Error Alert',
          body: `Error: ${event.payload.message}\nTenant: ${event.tenantId}\nTime: ${new Date(event.timestamp).toISOString()}`,
        },
        event.tenantId,
      );
    });
  }

  @OnEvent('order.placed')
  async handleOrderPlaced(event: eventInterface.INexusEvent) {
    await runWithTenant(event.tenantId, async () => {
      this.logger.log(`Order placed for tenant ${event.tenantId}`);
      
      await this.queueService.addEmailJob(
        {
          recipient: event.payload.email,
          subject: 'Order Confirmation',
          body: `Your order #${event.payload.orderId} has been placed successfully!`,
          userId: event.payload.userId,
        },
        event.tenantId,
      );
    });
  }
}
