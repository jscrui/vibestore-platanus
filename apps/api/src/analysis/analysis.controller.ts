import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBadGatewayResponse,
  ApiCreatedResponse,
  ApiGatewayTimeoutResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

import {
  AnalyzeRequestDto,
  AnalyzeResponseDto,
  ApiErrorDto,
} from './dto/analysis.dto';
import { AnalysisService } from './analysis.service';

@ApiTags('Analysis')
@Controller('analyze')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @ApiOperation({
    summary: 'Analizar pre-factibilidad comercial',
    description:
      'Geocodifica dirección, consulta Places, calcula score heurístico y devuelve dictamen con evidencia.',
  })
  @ApiCreatedResponse({
    description: 'Análisis generado correctamente.',
    type: AnalyzeResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Input inválido o dirección no encontrada.',
    type: ApiErrorDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit alcanzado en proveedor externo.',
    type: ApiErrorDto,
  })
  @ApiBadGatewayResponse({
    description: 'Error en proveedor externo.',
    type: ApiErrorDto,
  })
  @ApiGatewayTimeoutResponse({
    description: 'Timeout en proveedor externo.',
    type: ApiErrorDto,
  })
  @Post()
  async runAnalysis(@Body() body: AnalyzeRequestDto): Promise<AnalyzeResponseDto> {
    return this.analysisService.analyze(body);
  }
}
