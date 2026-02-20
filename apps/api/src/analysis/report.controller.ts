import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ReportService } from './services/report.service';

@ApiTags('Report')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @ApiOperation({ summary: 'Obtener reporte HTML imprimible por requestId' })
  @ApiParam({ name: 'requestId', example: 'req_b4b0e1838b4a4ce2' })
  @ApiOkResponse({
    description: 'HTML del reporte listo para compartir/imprimir.',
    content: { 'text/html': { schema: { type: 'string' } } },
  })
  @Get(':requestId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getReportHtml(@Param('requestId') requestId: string): string {
    return this.reportService.getHtml(requestId);
  }
}
