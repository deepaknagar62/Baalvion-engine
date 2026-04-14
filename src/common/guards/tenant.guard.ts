import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantContext } from '../../core/tenant/tenant-context';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const tenantId = TenantContext.getStore();

    if (!tenantId) {
      throw new UnauthorizedException('No tenant context found. Ensure tenant middleware is applied.');
    }

    return true;
  }
}
