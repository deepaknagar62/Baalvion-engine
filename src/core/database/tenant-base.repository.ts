import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
import { getCurrentTenantId } from '../tenant/tenant-context';

export abstract class TenantBaseRepository<T extends { tenantId: string; id: string }> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(options?: any): Promise<T[]> {
    const tenantId = getCurrentTenantId();
    return this.repository.find({
      ...options,
      where: {
        ...options?.where,
        tenantId,
      },
    });
  }

  async findOneById(id: string): Promise<T | null> {
    const tenantId = getCurrentTenantId();
    return this.repository.findOne({
      where: { id, tenantId } as FindOptionsWhere<T>,
    });
  }

  async findOneByWhere(where: Partial<T>): Promise<T | null> {
    const tenantId = getCurrentTenantId();
    return this.repository.findOne({
      where: { ...where, tenantId } as FindOptionsWhere<T>,
    });
  }

  async createEntity(data: DeepPartial<T>): Promise<T> {
    const tenantId = getCurrentTenantId();
    const entity = this.repository.create({
      ...data,
      tenantId,
    } as DeepPartial<T>);
    return this.repository.save(entity);
  }

  async updateEntity(id: string, data: DeepPartial<T>): Promise<T> {
    const tenantId = getCurrentTenantId();
    const entity = await this.repository.findOne({
      where: { id, tenantId } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new Error(`Entity with id ${id} not found for tenant ${tenantId}`);
    }

    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  async deleteEntity(id: string): Promise<void> {
    const tenantId = getCurrentTenantId();
    const entity = await this.repository.findOne({
      where: { id, tenantId } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new Error(`Entity with id ${id} not found for tenant ${tenantId}`);
    }

    await this.repository.remove(entity);
  }

  async countByTenant(): Promise<number> {
    const tenantId = getCurrentTenantId();
    return this.repository.count({
      where: { tenantId } as FindOptionsWhere<T>,
    });
  }
}
