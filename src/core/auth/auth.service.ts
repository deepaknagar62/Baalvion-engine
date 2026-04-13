import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
}
