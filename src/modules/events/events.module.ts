import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventBusService } from './event-bus.service';
import { NotificationListener } from './listeners/notification.listener';
import { DashboardListener } from './listeners/dashboard.listener';
import { TenantModule } from '../../core/tenant/tenant.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), TenantModule],
  controllers: [EventsController],
  providers: [EventsService, EventBusService, NotificationListener, DashboardListener],
  exports: [EventsService, EventBusService],
})
export class EventsModule {}
