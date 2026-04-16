import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../../modules/users/users.service';
import { runWithTenant } from '../tenant/tenant-context';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async validateToken(token: string): Promise<IJwtPayload> {
    try {
      const payload = this.jwtService.verify<IJwtPayload>(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async generateToken(userId: string, tenantId: string, email: string, roles: string[]): Promise<string> {
    const payload: IJwtPayload = {
      sub: userId,
      tenantId,
      email,
      roles,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '24h');
    const secret = this.configService.get<string>('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production');
    
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiresIn as any,
    });
  }

  async generateTenantApiKey(tenantId: string): Promise<string> {
    const payload: IJwtPayload = {
      sub: `api-key-${uuidv4()}`,
      tenantId,
      email: `api@${tenantId}`,
      roles: ['api'],
    };

    const secret = this.configService.get<string>('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production');
    
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: '365d' as any,
    });
  }

  /**
   * Login method that validates user credentials and generates JWT token
   * Supports both regular users and super admin authentication
   */
  async login(email: string, password: string, tenantId?: string): Promise<{ token: string; user: any; expiresIn: string }> {
    // Check if this is a super admin login attempt
    const superAdminEmail = this.configService.get<string>('superAdmin.email');
    const superAdminPassword = this.configService.get<string>('superAdmin.password');

    if (email === superAdminEmail && password === superAdminPassword) {
      // Super admin login - no tenant required
      return this.loginSuperAdmin(email);
    }

    // Regular user login - tenant is required
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required for regular user login');
    }

    // Find user by email in the database within tenant context
    const user = await runWithTenant(tenantId, async () => {
      return await this.usersService.findByEmail(email);
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials - user not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    // Note: In a real application, you would verify the password hash here
    // For now, we're assuming the user exists and is valid
    // TODO: Add password hashing and verification (bcrypt)

    // Update last login timestamp
    await this.usersService.updateLastLogin(user.id);

    // Generate JWT token
    const token = await this.generateToken(
      user.id,
      user.tenantId,
      user.email,
      [user.role]
    );

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '24h');

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      expiresIn,
    };
  }

  /**
   * Super admin login - generates token with super-admin role
   */
  private async loginSuperAdmin(email: string): Promise<{ token: string; user: any; expiresIn: string }> {
    const superAdminId = 'super-admin-' + uuidv4();
    const tenantId = 'system'; // System-level tenant for super admin

    const token = await this.generateToken(
      superAdminId,
      tenantId,
      email,
      ['super-admin']
    );

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '24h');

    return {
      token,
      user: {
        id: superAdminId,
        email,
        name: 'Super Administrator',
        role: 'super-admin',
        tenantId,
      },
      expiresIn,
    };
  }
}
