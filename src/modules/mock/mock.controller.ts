import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MockService } from './mock.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { NexusEventType } from '../../common/interfaces/event.interface';

class StartSimulationDto {
  @ApiProperty({ example: 5, description: 'Number of events to emit per second' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  eventsPerSecond!: number;

  @ApiProperty({ example: 30, description: 'Duration in seconds (omit for indefinite)', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  durationSeconds?: number;
}

class SingleEventDto {
  @ApiProperty({ example: 'user.login', description: 'Event type (omit for random)', required: false })
  @IsOptional()
  @IsString()
  eventType?: string;
}

class BurstDto {
  @ApiProperty({ example: 10, description: 'Number of events to generate' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  count!: number;

  @ApiProperty({ example: 'page.view', description: 'Event type (omit for random)', required: false })
  @IsOptional()
  @IsString()
  eventType?: string;
}

@ApiTags('Mock Generator')
@ApiBearerAuth('JWT-auth')
@Controller('mock')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class MockController {
  constructor(private readonly mockService: MockService) {}

  @Post('start')
  @Roles('admin')
  @ApiOperation({ summary: 'Start event simulation for current tenant' })
  @ApiResponse({ status: 201, description: 'Simulation started' })
  async startSimulation(
    @CurrentTenant() tenantId: string,
    @Body() body: StartSimulationDto,
  ) {
    return this.mockService.startSimulation(tenantId, body.eventsPerSecond, body.durationSeconds);
  }

  @Post('stop')
  @Roles('admin')
  @ApiOperation({ summary: 'Stop simulation for current tenant' })
  @ApiResponse({ status: 200, description: 'Simulation stopped' })
  async stopSimulation(@CurrentTenant() tenantId: string) {
    return this.mockService.stopSimulation(tenantId);
  }

  @Post('stop/:tenantId')
  @Roles('super-admin')
  @ApiOperation({ summary: 'Stop simulation for a specific tenant (super-admin)' })
  @ApiResponse({ status: 200, description: 'Simulation stopped' })
  async stopSimulationByTenant(@Param('tenantId') tenantId: string) {
    return this.mockService.stopSimulation(tenantId);
  }

  @Post('stop-all')
  @Roles('super-admin')
  @ApiOperation({ summary: 'Stop all simulations (super-admin)' })
  @ApiResponse({ status: 200, description: 'All simulations stopped' })
  async stopAllSimulations() {
    return this.mockService.stopAllSimulations();
  }

  @Get('active')
  @Roles('admin')
  @ApiOperation({ summary: 'Get active simulations' })
  @ApiResponse({ status: 200, description: 'List of active simulations' })
  async getActiveSimulations() {
    const active = this.mockService.getActiveSimulations();
    return { active, count: active.length };
  }

  @Post('single')
  @Roles('admin')
  @ApiOperation({ summary: 'Generate single event for current tenant' })
  @ApiResponse({ status: 201, description: 'Event generated' })
  async generateSingleEvent(
    @CurrentTenant() tenantId: string,
    @Body() body: SingleEventDto,
  ) {
    return this.mockService.generateSingleEvent(tenantId, body.eventType);
  }

  @Post('burst')
  @Roles('admin')
  @ApiOperation({ summary: 'Generate event burst for current tenant' })
  @ApiResponse({ status: 201, description: 'Event burst generated' })
  async runBurst(
    @CurrentTenant() tenantId: string,
    @Body() body: BurstDto,
  ) {
    return this.mockService.runBurst(tenantId, body.count, body.eventType);
  }

  @Get('event-types')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all available event types' })
  @ApiResponse({ status: 200, description: 'List of event types' })
  async getEventTypes() {
    return {
      types: Object.values(NexusEventType),
      descriptions: {
        'user.login': 'User login event',
        'user.logout': 'User logout event',
        'user.signup': 'User signup event',
        'user.updated': 'User profile updated',
        'page.view': 'Page view event',
        'order.placed': 'Order placed event',
        'order.updated': 'Order updated event',
        'notification.sent': 'Notification sent event',
        'notification.failed': 'Notification failed event',
        'system.error': 'System error event',
        'system.alert': 'System alert event',
        'mock.event': 'Mock generated event',
      },
    };
  }
}
