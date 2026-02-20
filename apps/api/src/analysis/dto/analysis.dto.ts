import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  Validate,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { BusinessCategory } from '../constants/business-category';
import { IsAvgTicketValueConstraint } from './avg-ticket.validator';

export class AnalyzeRequestDto {
  @ApiProperty({
    example: 'Av. Santa Fe 2300, CABA',
    description: 'Dirección a evaluar.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 220)
  address!: string;

  @ApiProperty({
    enum: BusinessCategory,
    example: BusinessCategory.CAFE,
  })
  @IsEnum(BusinessCategory)
  businessCategory!: BusinessCategory;

  @ApiPropertyOptional({
    description: 'Ticket promedio. Puede ser bucket low|mid|high o número.',
    oneOf: [{ type: 'string', enum: ['low', 'mid', 'high'] }, { type: 'number' }],
    examples: {
      bucket: { value: 'mid' },
      numeric: { value: 12000 },
    },
  })
  @IsOptional()
  @Validate(IsAvgTicketValueConstraint)
  avgTicket?: string | number;

  @ApiPropertyOptional({
    description: 'Sesgo de país para geocodificación. Default AR.',
    example: 'AR',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryBias?: string;

  @ApiPropertyOptional({
    description: 'place_id de Google Autocomplete para geocoding preciso.',
    example: 'ChIJj61dQgK0vJUR4GeTYWZsKWw',
  })
  @IsOptional()
  @IsString()
  placeId?: string;
}

export class LocationDto {
  @ApiProperty({ example: -34.5952 })
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: -58.3974 })
  @IsNumber()
  lng!: number;

  @ApiProperty({ example: 'Av. Santa Fe 2300, CABA, Argentina' })
  @IsString()
  formattedAddress!: string;

  @ApiPropertyOptional({ example: 'ChIJj61dQgK0vJUR4GeTYWZsKWw' })
  @IsOptional()
  @IsString()
  placeId?: string;
}

export class MetricsDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 62 })
  @IsInt()
  @Min(0)
  @Max(100)
  competitionScore!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 81 })
  @IsInt()
  @Min(0)
  @Max(100)
  demandScore!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 55 })
  @IsInt()
  @Min(0)
  @Max(100)
  differentiationScore!: number;
}

export class PriceGapDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isGap!: boolean;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  suggested?: string;

  @ApiPropertyOptional({ example: '2-3' })
  @IsOptional()
  @IsString()
  dominant?: string;

  @ApiPropertyOptional({ example: 'Dominio del segmento 2-3 y baja cobertura en 1.' })
  @IsOptional()
  @IsString()
  detail?: string;
}

export class HardMetricsDto {
  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(0)
  count_same_800m!: number;

  @ApiProperty({ example: 38 })
  @IsInt()
  @Min(0)
  count_same_1500m!: number;

  @ApiProperty({ example: 220 })
  @IsInt()
  @Min(0)
  density_all_800m!: number;

  @ApiProperty({ example: 4.3 })
  @IsNumber()
  avg_rating_same!: number;

  @ApiProperty({ example: 180 })
  @IsNumber()
  median_reviews_same!: number;

  @ApiProperty({ example: 42000 })
  @IsInt()
  @Min(0)
  total_reviews_all_800m!: number;

  @ApiProperty({ example: 95 })
  @IsInt()
  @Min(0)
  count_food_drink_800m!: number;

  @ApiProperty({
    description: 'Histograma de price_level de competidores same-category.',
    example: { '1': 5, '2': 20, '3': 12, '4': 1 },
    additionalProperties: { type: 'number' },
  })
  @IsObject()
  price_level_distribution!: Record<string, number>;

  @ApiProperty({ type: PriceGapDto })
  @ValidateNested()
  @Type(() => PriceGapDto)
  detected_price_gap!: PriceGapDto;
}

export class CompetitorTopDto {
  @ApiProperty({ example: 'ChIJ...' })
  @IsString()
  place_id!: string;

  @ApiProperty({ example: 'Cafe de Barrio' })
  @IsString()
  name!: string;

  @ApiProperty({ type: Number, nullable: true, example: 4.5 })
  @IsOptional()
  @IsNumber()
  rating!: number | null;

  @ApiProperty({ example: 1200 })
  @IsInt()
  @Min(0)
  user_ratings_total!: number;

  @ApiProperty({ type: Number, nullable: true, example: 2 })
  @IsOptional()
  @IsInt()
  price_level!: number | null;

  @ApiProperty({ type: [String], example: ['cafe', 'food', 'point_of_interest'] })
  @IsArray()
  @IsString({ each: true })
  types!: string[];

  @ApiProperty({ example: 210 })
  @IsInt()
  @Min(0)
  distance_m!: number;
}

export class MapCenterDto {
  @ApiProperty({ example: -34.56 })
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: -58.45 })
  @IsNumber()
  lng!: number;
}

export class MapDataDto {
  @ApiProperty({ type: () => MapCenterDto })
  @ValidateNested()
  @Type(() => MapCenterDto)
  center!: MapCenterDto;

  @ApiProperty({ type: [CompetitorTopDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetitorTopDto)
  competitorsTop!: CompetitorTopDto[];
}

export class ReportDto {
  @ApiProperty({
    example: '/api/report/req_abc123',
  })
  @IsString()
  reportUrl!: string;

  @ApiProperty({ type: String, nullable: true, example: '/api/report/req_abc123.pdf' })
  @IsOptional()
  @IsString()
  pdfUrl!: string | null;
}

export class TimingMsDto {
  @ApiProperty({ example: 300 })
  geocode!: number;

  @ApiProperty({ example: 900 })
  nearby!: number;

  @ApiProperty({ example: 2400 })
  details!: number;

  @ApiProperty({ example: 10 })
  score!: number;

  @ApiProperty({ example: 1200 })
  llm!: number;

  @ApiProperty({ example: 5200 })
  total!: number;
}

export class AnalyzeResponseDto {
  @ApiProperty({ example: 'req_b4b0e1838b4a4ce2' })
  @IsString()
  requestId!: string;

  @ApiProperty({
    example: {
      address: 'Av. Cabildo 2200, CABA',
      businessCategory: 'CAFE',
      avgTicket: 'mid',
      countryBias: 'AR',
    },
  })
  input!: {
    address: string;
    businessCategory: BusinessCategory;
    avgTicket?: string | number;
    countryBias: string;
  };

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @ApiProperty({ minimum: 0, maximum: 100, example: 78 })
  @IsInt()
  @Min(0)
  @Max(100)
  viabilityScore!: number;

  @ApiProperty({ enum: ['OPEN', 'OPEN_WITH_CONDITIONS', 'DO_NOT_OPEN'] })
  verdict!: 'OPEN' | 'OPEN_WITH_CONDITIONS' | 'DO_NOT_OPEN';

  @ApiProperty({ type: MetricsDto })
  @ValidateNested()
  @Type(() => MetricsDto)
  metrics!: MetricsDto;

  @ApiProperty({ type: HardMetricsDto })
  @ValidateNested()
  @Type(() => HardMetricsDto)
  hardMetrics!: HardMetricsDto;

  @ApiProperty({
    type: [CompetitorTopDto],
    description: 'Top 10 competidores directos por relevancia (auditable).',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetitorTopDto)
  competitorsTop!: CompetitorTopDto[];

  @ApiProperty({
    type: [String],
    description: '5 insights accionables basados solo en métricas.',
  })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  insights!: string[];

  @ApiProperty({
    example:
      'La zona muestra demanda alta por volumen de reseñas, pero saturación relevante en 800m.',
  })
  @IsString()
  diagnosis!: string;

  @ApiProperty({
    example: 'pricing',
    enum: ['specialty', 'take-away', 'hours', 'pricing', 'niche-audience'],
  })
  @IsString()
  recommendationAngle!: string;

  @ApiProperty({ type: MapDataDto })
  @ValidateNested()
  @Type(() => MapDataDto)
  mapData!: MapDataDto;

  @ApiProperty({ type: ReportDto })
  @ValidateNested()
  @Type(() => ReportDto)
  report!: ReportDto;

  @ApiProperty({ type: TimingMsDto })
  @ValidateNested()
  @Type(() => TimingMsDto)
  timingMs!: TimingMsDto;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  generatedAt!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  cacheHit!: boolean;
}

export class ApiErrorDto {
  @ApiProperty({ example: 'ADDRESS_NOT_FOUND' })
  @IsString()
  errorCode!: string;

  @ApiProperty({ example: 'No se encontró una ubicación válida para la dirección.' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({
    example: { address: 'direccion de prueba' },
  })
  @IsOptional()
  details?: Record<string, unknown>;
}
