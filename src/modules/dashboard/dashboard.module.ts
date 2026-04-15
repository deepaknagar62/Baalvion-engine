import { Module } from '@nestjs/common';
import { DashboardGateway } from './dashboard.gateway';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AuthModule } from '../../core/auth/auth.module';
import { EventsModule } from '../events/events.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TenantModule } from '../../core/tenant/tenant.module';

@Module({
  imports: [AuthModule, EventsModule, RealtimeModule, TenantModule],
  controllers: [DashboardController],
  providers: [DashboardGateway, DashboardService],
  exports: [DashboardGateway, DashboardService],
})
export class DashboardModule {}
