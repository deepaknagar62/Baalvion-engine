import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { TenantContext } from './tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const hostname = req.get('x-tenant-domain') || req.hostname;

      const tenant = await this.tenantService.findByDomain(hostname);

      if (!tenant) {
        throw new UnauthorizedException(`Unknown tenant domain: ${hostname}`);
      }

      if (!tenant.isActive) {
        throw new ForbiddenException('Tenant is not active');
      }

      req['tenantId'] = tenant.id;
      req['tenant'] = tenant;

      TenantContext.run(tenant.id, () => {
        next();
      });
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      next();
    }
  }
}
