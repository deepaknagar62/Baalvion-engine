import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { getCurrentTenantId } from '../../core/tenant/tenant-context';

@Injectable()
export class TenantRedisService {
  constructor(private readonly redisService: RedisService) {}

  private key(suffix: string): string {
    const tenantId = getCurrentTenantId();
    return `tenant:${tenantId}:${suffix}`;
  }

  async get(suffix: string): Promise<string | null> {
    return this.redisService.get(this.key(suffix));
  }

  async set(suffix: string, value: string, ttlSeconds?: number): Promise<void> {
    return this.redisService.set(this.key(suffix), value, ttlSeconds);
  }

  async del(suffix: string): Promise<void> {
    return this.redisService.del(this.key(suffix));
  }

  async incr(suffix: string): Promise<number> {
    return this.redisService.incr(this.key(suffix));
  }

  async expire(suffix: string, ttl: number): Promise<void> {
    return this.redisService.expire(this.key(suffix), ttl);
  }

  async hset(suffix: string, field: string, value: string): Promise<void> {
    return this.redisService.hset(this.key(suffix), field, value);
  }

  async hget(suffix: string, field: string): Promise<string | null> {
    return this.redisService.hget(this.key(suffix), field);
  }

  async hgetall(suffix: string): Promise<Record<string, string>> {
    return this.redisService.hgetall(this.key(suffix));
  }

  async lpush(suffix: string, value: string): Promise<void> {
    return this.redisService.lpush(this.key(suffix), value);
  }

  async lrange(suffix: string, start: number, stop: number): Promise<string[]> {
    return this.redisService.lrange(this.key(suffix), start, stop);
  }

  async ltrim(suffix: string, start: number, stop: number): Promise<void> {
    return this.redisService.ltrim(this.key(suffix), start, stop);
  }

  async exists(suffix: string): Promise<boolean> {
    return this.redisService.exists(this.key(suffix));
  }

  async setNX(suffix: string, value: string, ttlSeconds?: number): Promise<boolean> {
    return this.redisService.setNX(this.key(suffix), value, ttlSeconds);
  }

  async invalidateTenantCache(): Promise<void> {
    const tenantId = getCurrentTenantId();
    await this.redisService.flushByPattern(`tenant:${tenantId}:cache:*`);
  }

  getSessionKey(userId: string): string {
    const tenantId = getCurrentTenantId();
    return `tenant:${tenantId}:session:${userId}`;
  }

  getCacheKey(resource: string, id?: string): string {
    const tenantId = getCurrentTenantId();
    return id ? `tenant:${tenantId}:cache:${resource}:${id}` : `tenant:${tenantId}:cache:${resource}`;
  }

  getEventStreamKey(): string {
    const tenantId = getCurrentTenantId();
    return `tenant:${tenantId}:events:stream`;
  }

  getCounterKey(metric: string): string {
    const tenantId = getCurrentTenantId();
    return `tenant:${tenantId}:counter:${metric}`;
  }

  getRateLimitKey(ip: string): string {
    const tenantId = getCurrentTenantId();
    return `tenant:${tenantId}:ratelimit:${ip}`;
  }
}
