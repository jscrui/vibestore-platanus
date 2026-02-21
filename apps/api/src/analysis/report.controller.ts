import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ReportService } from './services/report.service';

@ApiTags('Report')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @ApiOperation({ summary: 'Descargar reporte PDF por requestId' })
  @ApiParam({ name: 'requestId', example: 'req_b4b0e1838b4a4ce2' })
  @ApiOkResponse({
    description: 'PDF del reporte listo para descarga.',
    content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
  })
  @Get(':requestId.pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="reporte-viabilidad.pdf"')
  async getReportPdf(@Param('requestId') requestId: string): Promise<Buffer> {
    const pdfBytes = await this.reportService.getPdf(requestId);
    return Buffer.from(pdfBytes);
  }

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
