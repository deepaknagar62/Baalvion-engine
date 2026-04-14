import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSessionDto {
  @ApiProperty({ 
    example: { 
      preferences: { theme: 'light', language: 'es' },
      lastActivity: '2026-04-14T06:00:00.000Z'
    }, 
    description: 'Updated session data object' 
  })
  @IsObject()
  data: Record<string, any>;
}
