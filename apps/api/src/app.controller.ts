import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthResponseDto } from './app.dto';

@ApiTags('Health')
@Controller()
export class AppController {
  @ApiOperation({
    summary: 'Health check',
    description: 'Confirma que la API está levantada y lista para recibir requests.',
  })
  @ApiOkResponse({
    description: 'Estado operativo del servicio.',
    type: HealthResponseDto,
  })
  @Get('health')
  health(): HealthResponseDto {
    return {
      status: 'ok',
      service: '@vibe-store/api',
      timestamp: new Date().toISOString(),
    };
  }
}
