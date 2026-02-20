import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString } from 'class-validator';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  @IsIn(['ok'])
  status!: 'ok';

  @ApiProperty({ example: '@vibe-store/api' })
  @IsString()
  service!: string;

  @ApiProperty({
    description: 'Timestamp del servidor en formato ISO 8601.',
    example: '2026-02-20T20:43:26.478Z',
  })
  @IsDateString()
  timestamp!: string;
}
