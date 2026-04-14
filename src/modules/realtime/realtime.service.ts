import { Injectable, Inject } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import Redis from 'ioredis';

@Injectable()
export class RealtimeService {
  constructor(
    private readonly realtimeGateway: RealtimeGateway,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  emit(tenantId: string, event: string, data: any) {
    this.realtimeGateway.broadcastToTenant(tenantId, event, data);
  }

  emitToUser(tenantId: string, userId: string, event: string, data: any) {
    this.realtimeGateway.broadcastToUser(tenantId, userId, event, data);
  }

  emitToAdmins(tenantId: string, event: string, data: any) {
    this.realtimeGateway.broadcastToAdmins(tenantId, event, data);
  }

  async getOnlineUsers(tenantId: string): Promise<string[]> {
    const pattern = `tenant:${tenantId}:online:*`;
    const keys = await this.redis.keys(pattern);
    return keys.map(key => key.split(':').pop()).filter((id): id is string => id !== undefined);
  }

  async getConnectionCount(tenantId: string): Promise<number> {
    return this.realtimeGateway.getConnectedClients(tenantId);
  }

}
