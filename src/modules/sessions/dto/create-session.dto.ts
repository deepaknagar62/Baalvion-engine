import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ 
    example: 'user-123-456', 
    description: 'User ID for the session' 
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ 
    example: { 
      preferences: { theme: 'dark', language: 'en' },
      lastActivity: '2026-04-14T05:00:00.000Z'
    }, 
    description: 'Session data object' 
  })
  @IsObject()
  data: Record<string, any>;
}
