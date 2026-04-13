import { IsString, IsNotEmpty, Matches, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ITenantConfig } from '../../../common/interfaces/tenant.interface';

export class CreateTenantDto {
  @ApiProperty({ example: 'store-001', description: 'Unique tenant slug' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @ApiProperty({ example: 'store.baalvion.com', description: 'Tenant domain' })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({ example: 'Store 001', description: 'Tenant display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Tenant configuration object' })
  @IsOptional()
  @IsObject()
  config?: Partial<ITenantConfig>;
}
