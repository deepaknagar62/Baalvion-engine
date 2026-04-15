import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DashboardService } from './dashboard.service';

@WebSocketGateway({
  namespace: '/dashboard',
  cors: { origin: '*' },
})
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DashboardGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly dashboardService: DashboardService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;

      if (!token) {
        client.emit('error', { message: 'No token provided' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const { sub: userId, tenantId, roles } = payload;

      client.data.tenantId = tenantId;
      client.data.userId = userId;
      client.data.roles = roles;

      if (roles.includes('super-admin')) {
        await client.join('global:admin');
        await client.join(`tenant:${tenantId}:admin`);
      } else if (roles.includes('admin')) {
        await client.join(`tenant:${tenantId}:admin`);
      } else {
        client.emit('error', { message: 'Insufficient permissions' });
        client.disconnect();
        return;
      }

      const snapshot = await this.dashboardService.getSnapshot(tenantId);
      client.emit('dashboard.snapshot', snapshot);

      this.logger.log(`Dashboard client connected: ${userId} (tenant: ${tenantId})`);
    } catch (error) {
      this.logger.error(`Dashboard connection error: ${error instanceof Error ? error.message : String(error)}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const { userId, tenantId } = client.data;
    if (userId && tenantId) {
      this.logger.log(`Dashboard client disconnected: ${userId} (tenant: ${tenantId})`);
    }
  }

  @SubscribeMessage('get.stats')
  async handleGetStats(@ConnectedSocket() client: Socket) {
    const { tenantId } = client.data;
    const stats = await this.dashboardService.getSnapshot(tenantId);
    return { event: 'stats', data: stats };
  }

  @SubscribeMessage('get.activity.stream')
  async handleGetActivityStream(@ConnectedSocket() client: Socket) {
    const { tenantId } = client.data;
    const activity = await this.dashboardService.getSnapshot(tenantId);
    return { event: 'activity.stream', data: activity.recentEvents };
  }

  broadcastToDashboard(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}:admin`).emit(event, data);
  }

  broadcastToGlobalDashboard(event: string, data: any) {
    this.server.to('global:admin').emit(event, data);
  }
}
