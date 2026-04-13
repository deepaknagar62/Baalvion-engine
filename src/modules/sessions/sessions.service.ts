import { Injectable } from '@nestjs/common';
import { TenantRedisService } from '../../infra/redis/tenant-redis.service';
import { RedisService } from '../../infra/redis/redis.service';
import { getCurrentTenantId } from '../../core/tenant/tenant-context';
import { v4 as uuidv4 } from 'uuid';

export interface SessionData {
  userId: string;
  tenantId: string;
  data: Record<string, any>;
  createdAt: string;
  lastActiveAt: string;
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly tenantRedisService: TenantRedisService,
    private readonly redisService: RedisService,
  ) {}

  async createSession(userId: string, data: Record<string, any>): Promise<string> {
    const tenantId = getCurrentTenantId();
    const sessionId = uuidv4();
    const sessionKey = `session:${userId}`;
    
    const sessionData: SessionData = {
      userId,
      tenantId,
      data,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    await this.tenantRedisService.set(sessionKey, JSON.stringify(sessionData), 86400);
    
    return sessionId;
  }

  async getSession(userId: string): Promise<SessionData | null> {
    const sessionKey = `session:${userId}`;
    const data = await this.tenantRedisService.get(sessionKey);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  async updateSession(userId: string, data: Record<string, any>): Promise<void> {
    const session = await this.getSession(userId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    session.data = { ...session.data, ...data };
    session.lastActiveAt = new Date().toISOString();

    const sessionKey = `session:${userId}`;
    await this.tenantRedisService.set(sessionKey, JSON.stringify(session), 86400);
  }

  async deleteSession(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;
    await this.tenantRedisService.del(sessionKey);
  }

  async getAllActiveSessions(): Promise<SessionData[]> {
    const tenantId = getCurrentTenantId();
    const pattern = `tenant:${tenantId}:session:*`;
    const keys = await this.redisService.keys(pattern);
    
    const sessions: SessionData[] = [];
    
    for (const key of keys) {
      const data = await this.redisService.get(key);
      if (data) {
        sessions.push(JSON.parse(data));
      }
    }

    return sessions;
  }

  async isSessionActive(userId: string): Promise<boolean> {
    const sessionKey = `session:${userId}`;
    return this.tenantRedisService.exists(sessionKey);
  }

  async refreshSession(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;
    await this.tenantRedisService.expire(sessionKey, 86400);
  }
}
