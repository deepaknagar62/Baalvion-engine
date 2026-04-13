import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GenerateTokenDto, ValidateTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  @ApiOperation({ summary: 'Generate JWT token (dev/testing only)' })
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
