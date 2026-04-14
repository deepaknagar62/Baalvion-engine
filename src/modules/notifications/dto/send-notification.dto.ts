import { IsEnum, IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({ enum: ['email', 'sms', 'push', 'inapp'], description: 'Notification channel' })
  @IsEnum(['email', 'sms', 'push', 'inapp'])
  channel: string;

  @ApiProperty({ example: 'user@example.com', description: 'Recipient (email, phone, deviceToken, or userId)' })
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @ApiPropertyOptional({ example: 'Welcome!', description: 'Notification subject' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Welcome to our platform!', description: 'Notification body' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: 'user-123', description: 'User ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: 'welcome-email', description: 'Template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;
}
