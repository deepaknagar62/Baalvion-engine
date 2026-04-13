import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantRepository {
  constructor(
    @InjectRepository(Tenant)
    private readonly repository: Repository<Tenant>,
  ) {}

  async findByDomain(domain: string): Promise<Tenant | null> {
    return this.repository.findOne({ where: { domain } });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async findAllActive(): Promise<Tenant[]> {
    return this.repository.find({ where: { isActive: true } });
  }

  async create(data: CreateTenantDto): Promise<Tenant> {
    const tenant = this.repository.create({
      ...data,
      config: {
        features: [],
        plan: 'free',
        theme: 'default',
        notificationChannels: ['email', 'inapp'],
        maxUsersPerTenant: 100,
        customDomains: [],
        ...data.config,
      },
    });
    return this.repository.save(tenant);
  }

  async update(id: string, data: UpdateTenantDto): Promise<Tenant> {
    await this.repository.update(id, data);
    const tenant = await this.findById(id);
    if (!tenant) {
      throw new Error(`Tenant with id ${id} not found`);
    }
    return tenant;
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAll(): Promise<Tenant[]> {
    return this.repository.find();
  }
}
