import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getCurrentTenantIdSafe } from '../../core/tenant/tenant-context';

@Injectable()
export class TenantResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const tenantId = getCurrentTenantIdSafe();
        
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          return {
            ...data,
            tenantId,
          };
        }
        
        return data;
      }),
    );
  }
}
