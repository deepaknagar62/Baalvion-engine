import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GenerateTokenDto, ValidateTokenDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login with email and password',
    description: 'Authenticate user and generate JWT token. Supports both regular users (requires tenantId) and super admin (no tenantId needed).'
  })
  @ApiResponse({
    status: 201,
    description: 'Login successful, token generated',
    schema: {
      example: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'user',
          tenantId: 'tenant-001'
        },
        expiresIn: '24h'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or user not found' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.tenantId);
  }

  @Post('token')
  @ApiOperation({
    summary: 'Generate JWT token (dev/testing only)',
    description: 'Directly generate a token without validation. Use /auth/login for production.'
  })
  @ApiResponse({ status: 201, description: 'Token generated successfully' })
  async generateToken(@Body() dto: GenerateTokenDto) {
    const token = await this.authService.generateToken(
      dto.userId,
      dto.tenantId,
      dto.email,
      dto.roles,
    );
    return { token, expiresIn: '24h' };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async validateToken(@Body() dto: ValidateTokenDto) {
    const payload = await this.authService.validateToken(dto.token);
    return { valid: true, payload };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user from JWT' })
  @ApiResponse({ status: 200, description: 'Current user details' })
  async getCurrentUser(@CurrentUser() user: any) {
    return user;
  }
}
