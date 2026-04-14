import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Sessions')
@ApiBearerAuth('JWT-auth')
@Controller('sessions')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(@Body() dto: CreateSessionDto) {
    const sessionId = await this.sessionsService.createSession(dto.userId, dto.data);
    return { sessionId };
  }

  @Get()
  @ApiOperation({ summary: 'Get all active sessions for tenant' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  async getAllSessions() {
    return this.sessionsService.getAllActiveSessions();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get session by user ID' })
  @ApiResponse({ status: 200, description: 'Session data' })
  async getSession(@Param('userId') userId: string) {
    return this.sessionsService.getSession(userId);
  }

  @Put(':userId')
  @ApiOperation({ summary: 'Update session' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  async updateSession(@Param('userId') userId: string, @Body() dto: UpdateSessionDto) {
    await this.sessionsService.updateSession(userId, dto.data);
    return { success: true };
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Delete session' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  async deleteSession(@Param('userId') userId: string) {
    await this.sessionsService.deleteSession(userId);
    return { success: true };
  }

  @Post(':userId/refresh')
  @ApiOperation({ summary: 'Refresh session TTL' })
  @ApiResponse({ status: 200, description: 'Session refreshed successfully' })
  async refreshSession(@Param('userId') userId: string) {
    await this.sessionsService.refreshSession(userId);
    return { success: true };
  }
}
