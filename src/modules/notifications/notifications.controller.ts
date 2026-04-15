import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  async send(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send(dto);
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Send multiple notifications' })
  @ApiResponse({ status: 201, description: 'Notifications sent successfully' })
  async sendBulk(@Body() dtos: SendNotificationDto[]) {
    return this.notificationsService.sendBulk(dtos);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notifications for user' })
  @ApiResponse({ status: 200, description: 'User notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getNotificationsForUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getNotificationsForUser(
      userId,
      page ? parseInt(page.toString(), 10) : 1,
      limit ? parseInt(limit.toString(), 10) : 50,
    );
  }

  @Get('user/:userId/inapp')
  @ApiOperation({ summary: 'Get in-app notifications for user' })
  @ApiResponse({ status: 200, description: 'In-app notifications' })
  async getInAppNotifications(@Param('userId') userId: string) {
    return this.notificationsService.getInAppNotifications(userId);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id') id: string, @Body() body: { userId: string }) {
    await this.notificationsService.markAsRead(id, body.userId);
    return { success: true };
  }

  @Get('user/:userId/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get delivery statistics' })
  @ApiResponse({ status: 200, description: 'Delivery statistics' })
  async getDeliveryStats() {
    return this.notificationsService.getDeliveryStats();
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry failed notification' })
  @ApiResponse({ status: 200, description: 'Notification retry queued' })
  async retryFailed(@Param('id') id: string) {
    await this.notificationsService.retryFailed(id);
    return { success: true };
  }
}
