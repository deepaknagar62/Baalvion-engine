import { Injectable, Inject } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { getCurrentTenantId } from '../../core/tenant/tenant-context';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = await this.usersRepository.createEntity(dto);
    
    this.eventEmitter.emit('user.created', {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
    });

    await this.invalidateCache();
    return user;
  }

  async findAll(): Promise<User[]> {
    const tenantId = getCurrentTenantId();
    const cacheKey = `tenant:${tenantId}:cache:users:all`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const users = await this.usersRepository.findAll();
    await this.redis.setex(cacheKey, 300, JSON.stringify(users));
    
    return users;
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOneById(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.updateEntity(id, dto);
    await this.invalidateCache();
    return user;
  }

  async deactivate(id: string): Promise<User> {
    return this.update(id, { isActive: false });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.updateLastLogin(userId);
  }

  async count(): Promise<number> {
    return this.usersRepository.countByTenant();
  }

  private async invalidateCache(): Promise<void> {
    const tenantId = getCurrentTenantId();
    await this.redis.del(`tenant:${tenantId}:cache:users:all`);
  }
}
