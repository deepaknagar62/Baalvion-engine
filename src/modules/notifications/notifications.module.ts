import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { PushProvider } from './providers/push.provider';
import { EmailProcessor } from './processors/email.processor';
import { SmsProcessor } from './processors/sms.processor';
import { PushProcessor } from './processors/push.processor';
import { InAppProcessor } from './processors/inapp.processor';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), EventsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailProvider,
    SmsProvider,
    PushProvider,
    EmailProcessor,
    SmsProcessor,
    PushProcessor,
    InAppProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
