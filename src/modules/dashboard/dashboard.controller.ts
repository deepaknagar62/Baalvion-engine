import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('snapshot')
  @Roles('admin')
  @ApiOperation({ summary: 'Get current tenant dashboard snapshot' })
  @ApiResponse({ status: 200, description: 'Dashboard snapshot' })
  async getSnapshot(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getSnapshot(tenantId);
  }

  @Get('global')
  @Roles('super-admin')
  @ApiOperation({ summary: 'Get global snapshot across all tenants' })
  @ApiResponse({ status: 200, description: 'Global dashboard snapshot' })
  async getGlobalSnapshot() {
    return this.dashboardService.getGlobalSnapshot();
  }

  @Get('counters')
  @Roles('admin')
  @ApiOperation({ summary: 'Get live event counters' })
  @ApiResponse({ status: 200, description: 'Event counters' })
  async getLiveCounters(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getLiveCounters(tenantId);
  }

  @Get('activity')
  @Roles('admin')
  @ApiOperation({ summary: 'Get recent activity stream' })
  @ApiResponse({ status: 200, description: 'Activity stream' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getActivity(@CurrentTenant() tenantId: string, @Query('limit') limit?: number) {
    const snapshot = await this.dashboardService.getSnapshot(tenantId);
    return snapshot.recentEvents.slice(0, limit ? parseInt(limit.toString(), 10) : 50);
  }

  @Get('queue-stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get BullMQ queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getQueueStats() {
    return this.dashboardService.getQueueDepths();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health check' })
  @ApiResponse({ status: 200, description: 'System health' })
  async getHealth() {
    return this.dashboardService.getSystemHealth();
  }

  @Get('online-users')
  @Roles('admin')
  @ApiOperation({ summary: 'Get count of online users' })
  @ApiResponse({ status: 200, description: 'Online user count' })
  async getOnlineUsers(@CurrentTenant() tenantId: string) {
    const snapshot = await this.dashboardService.getSnapshot(tenantId);
    return { count: snapshot.connectedUsers };
  }
}
