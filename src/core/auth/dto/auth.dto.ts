import { IsString, IsNotEmpty, IsArray, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateTokenDto {
  @ApiProperty({ example: 'user-123', description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'tenant-001', description: 'Tenant ID' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: ['user', 'admin'], description: 'User roles' })
  @IsArray()
  @IsString({ each: true })
  roles: string[];
}

export class ValidateTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password (for super admin only)' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'tenant-001', description: 'Tenant ID (optional for super admin)', required: false })
  @IsString()
  tenantId?: string;
}
