export interface IJwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}
