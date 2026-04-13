import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request['tenantId'];

    if (!tenantId) {
      throw new UnauthorizedException('No tenant context found. Ensure tenant middleware is applied.');
    }

    return true;
  }
}
