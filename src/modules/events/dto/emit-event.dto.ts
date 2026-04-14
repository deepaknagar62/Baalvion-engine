import { IsString, IsNotEmpty, IsObject, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NexusEventType } from '../../../common/interfaces/event.interface';

export class EmitEventDto {
  @ApiProperty({ enum: NexusEventType, description: 'Event type' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(NexusEventType)
  eventType: string;

  @ApiProperty({ example: 'api-service', description: 'Event source' })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({ description: 'Event payload data' })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional event metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
