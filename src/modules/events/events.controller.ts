import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { EmitEventDto } from './dto/emit-event.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { NexusEventType } from '../../common/interfaces/event.interface';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('emit')
  @ApiOperation({ summary: 'Emit a new event' })
  @ApiResponse({ status: 201, description: 'Event emitted successfully' })
  async emitEvent(@Body() dto: EmitEventDto) {
    return this.eventsService.emit(dto);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent events from stream' })
  @ApiResponse({ status: 200, description: 'Recent events' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentEvents(@Query('limit') limit?: number) {
    return this.eventsService.getRecentEvents(limit ? parseInt(limit.toString(), 10) : 50);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get event history with filters' })
  @ApiResponse({ status: 200, description: 'Event history' })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEventHistory(
    @Query('eventType') eventType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.getEventHistory({
      eventType,
      page: page ? parseInt(page.toString(), 10) : 1,
      limit: limit ? parseInt(limit.toString(), 10) : 50,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get event statistics' })
  @ApiResponse({ status: 200, description: 'Event statistics' })
  async getEventStats() {
    return this.eventsService.getEventStats();
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all event types' })
  @ApiResponse({ status: 200, description: 'List of event types' })
  async getEventTypes() {
    return Object.values(NexusEventType);
  }
}
