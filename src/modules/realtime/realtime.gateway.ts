import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject('REDIS_PUBSUB_PUBLISHER') private readonly pubClient: Redis,
    @Inject('REDIS_PUBSUB_SUBSCRIBER') private readonly subClient: Redis,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  afterInit(server: Server) {
    const redisAdapter = createAdapter(this.pubClient, this.subClient);
    this.logger.debug(`Server type: ${typeof server}, has adapter: ${typeof server.adapter}`);
    this.logger.debug(`This.server type: ${typeof this.server}, has adapter: ${typeof this.server?.adapter}`);
    
    // Use the server parameter which is the actual Socket.IO server instance
    if (typeof server.adapter === 'function') {
      server.adapter(redisAdapter);
      this.logger.log('RealtimeGateway initialized with Redis adapter');
    } else {
      this.logger.error('server.adapter is not a function - cannot set Redis adapter');
    }
  }

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

      await client.join(`tenant:${tenantId}`);
      await client.join(`tenant:${tenantId}:user:${userId}`);

      if (roles.includes('admin')) {
        await client.join(`tenant:${tenantId}:admin`);
      }

      await this.redis.setex(`tenant:${tenantId}:online:${userId}`, 3600, '1');
      await this.redis.incr(`tenant:${tenantId}:counter:ws.connected`);

      client.emit('connection.success', {
        userId,
        tenantId,
        rooms: [`tenant:${tenantId}`, `tenant:${tenantId}:user:${userId}`],
      });

      client.to(`tenant:${tenantId}`).emit('user.online', { userId, timestamp: Date.now() });

      this.logger.log(`Client connected: ${userId} (tenant: ${tenantId})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const { userId, tenantId } = client.data;

    if (userId && tenantId) {
      await this.redis.del(`tenant:${tenantId}:online:${userId}`);
      await this.redis.decr(`tenant:${tenantId}:counter:ws.connected`);

      client.to(`tenant:${tenantId}`).emit('user.offline', { userId, timestamp: Date.now() });

      this.logger.log(`Client disconnected: ${userId} (tenant: ${tenantId})`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const { tenantId } = client.data;
    return { event: 'pong', data: { timestamp: Date.now(), tenantId } };
  }

  @SubscribeMessage('subscribe.room')
  async handleSubscribeRoom(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    const { tenantId } = client.data;

    if (!data.room.startsWith(`tenant:${tenantId}:`)) {
      return { event: 'error', data: { message: 'Invalid room name' } };
    }

    await client.join(data.room);
    return { event: 'subscribed', data: { room: data.room } };
  }

  @SubscribeMessage('unsubscribe.room')
  async handleUnsubscribeRoom(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    await client.leave(data.room);
    return { event: 'unsubscribed', data: { room: data.room } };
  }

  broadcastToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  broadcastToUser(tenantId: string, userId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}:user:${userId}`).emit(event, data);
  }

  broadcastToAdmins(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}:admin`).emit(event, data);
  }

  async getConnectedClients(tenantId: string): Promise<number> {
    const count = await this.redis.get(`tenant:${tenantId}:counter:ws.connected`);
    return count ? parseInt(count, 10) : 0;
  }
}
