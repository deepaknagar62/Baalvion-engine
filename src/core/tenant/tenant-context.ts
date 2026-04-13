import { AsyncLocalStorage } from 'async_hooks';

export const TenantContext = new AsyncLocalStorage<string>();

export function getCurrentTenantId(): string {
  const tenantId = TenantContext.getStore();
  if (!tenantId) {
    throw new Error('TenantContext: no tenantId in current async context. Ensure TenantMiddleware is applied.');
  }
  return tenantId;
}

export function getCurrentTenantIdSafe(): string | undefined {
  return TenantContext.getStore();
}

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return TenantContext.run(tenantId, fn);
}
