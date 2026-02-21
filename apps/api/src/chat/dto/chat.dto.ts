import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

import { BusinessCategory } from '../../analysis/constants/business-category';

export class ChatMessageRequestDto {
  @ApiProperty({
    description: 'Identificador de sesión de chat.',
    example: 'chat_8ec742f4a2734a35',
  })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({
    description: 'Mensaje del usuario (máximo 240 caracteres).',
    example: 'Quiero abrir en Av. Santa Fe 2300, Buenos Aires, Argentina. Rubro café.',
    maxLength: 240,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  message!: string;
}

export class ChatCollectedDataDto {
  @ApiPropertyOptional({
    description: 'Dirección completa con país.',
    example: 'Av. Santa Fe 2300, Buenos Aires, Argentina',
  })
  address?: string;

  @ApiPropertyOptional({
    enum: BusinessCategory,
    example: BusinessCategory.CAFE,
  })
  businessCategory?: BusinessCategory;

  @ApiPropertyOptional({
    description: 'Ticket promedio numérico.',
    example: 12000,
  })
  avgTicket?: number;
}

export class ChatAnalysisPayloadDto {
  @ApiProperty({
    example: 'Av. Santa Fe 2300, Buenos Aires, Argentina',
  })
  address!: string;

  @ApiProperty({
    enum: BusinessCategory,
    example: BusinessCategory.CAFE,
  })
  businessCategory!: BusinessCategory;

  @ApiProperty({
    example: 12000,
  })
  avgTicket!: number;

  @ApiProperty({
    example: 'AR',
  })
  countryBias!: string;
}

export class ChatSessionResponseDto {
  @ApiProperty({
    example: 'chat_8ec742f4a2734a35',
  })
  sessionId!: string;

  @ApiProperty({
    enum: ['ACTIVE', 'COMPLETED', 'CLOSED'],
    example: 'ACTIVE',
  })
  sessionStatus!: 'ACTIVE' | 'COMPLETED' | 'CLOSED';

  @ApiProperty({
    example:
      '¿Dónde piensas abrir tu tienda? Dime la dirección completa con país, rubro y ticket promedio.',
  })
  assistantMessage!: string;

  @ApiProperty({
    example: 0,
  })
  invalidAttempts!: number;

  @ApiProperty({
    example: 3,
    description: 'Intentos no permitidos restantes antes de cierre de sesión.',
  })
  remainingInvalidAttempts!: number;

  @ApiProperty({
    type: [String],
    example: ['address', 'businessCategory', 'avgTicket'],
  })
  missingFields!: Array<'address' | 'businessCategory' | 'avgTicket'>;

  @ApiProperty({
    example: false,
  })
  readyForAnalysis!: boolean;

  @ApiProperty({
    type: ChatCollectedDataDto,
  })
  collectedData!: ChatCollectedDataDto;

  @ApiPropertyOptional({
    type: ChatAnalysisPayloadDto,
  })
  analysisPayload?: ChatAnalysisPayloadDto;
}
