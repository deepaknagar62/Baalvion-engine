import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { TenantBaseRepository } from '../../core/database/tenant-base.repository';
import { getCurrentTenantId } from '../../core/tenant/tenant-context';

@Injectable()
export class UsersRepository extends TenantBaseRepository<User> {
  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
  ) {
    super(repository);
  }

  async findByEmail(email: string): Promise<User | null> {
    const tenantId = getCurrentTenantId();
    return this.repository.findOne({
      where: { email, tenantId },
    });
  }

  async findActiveUsers(): Promise<User[]> {
    const tenantId = getCurrentTenantId();
    return this.repository.find({
      where: { tenantId, isActive: true },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    const tenantId = getCurrentTenantId();
    await this.repository.update(
      { id: userId, tenantId },
      { lastLoginAt: new Date() },
    );
  }
}
