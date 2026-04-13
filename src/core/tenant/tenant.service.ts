import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { TenantRepository } from './tenant.repository';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './tenant.entity';
import { ITenantConfig } from '../../common/interfaces/tenant.interface';
import Redis from 'ioredis';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async findByDomain(domain: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findByDomain(domain);
    if (!tenant) {
      throw new NotFoundException(`Tenant with domain ${domain} not found`);
    }
    return tenant;
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }
    return tenant;
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.findAllActive();
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const tenant = await this.tenantRepository.create(dto);
    await this.redis.del(`tenant:${tenant.id}:config`);
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.tenantRepository.update(id, dto);
    await this.redis.del(`tenant:${id}:config`);
    return tenant;
  }

  async getConfig(tenantId: string): Promise<ITenantConfig> {
    const cacheKey = `tenant:${tenantId}:config`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const tenant = await this.findById(tenantId);
    await this.redis.setex(cacheKey, 3600, JSON.stringify(tenant.config));
    return tenant.config;
  }

  async validateTenantFeature(tenantId: string, feature: string): Promise<boolean> {
    const config = await this.getConfig(tenantId);
    return config.features.includes(feature);
  }
}
