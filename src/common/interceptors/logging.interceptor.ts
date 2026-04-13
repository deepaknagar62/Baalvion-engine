import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getCurrentTenantIdSafe } from '../../core/tenant/tenant-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const tenantId = getCurrentTenantIdSafe();
    const userId = request.user?.userId || 'anonymous';
    const startTime = Date.now();

    this.logger.log(`→ ${method} ${url} | Tenant: ${tenantId} | User: ${userId}`);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const duration = Date.now() - startTime;

        this.logger.log(
          `← ${method} ${url} | Status: ${statusCode} | Duration: ${duration}ms | Tenant: ${tenantId}`,
        );
      }),
    );
  }
}
