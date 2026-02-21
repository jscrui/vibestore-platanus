import { HttpStatus, Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { ApiError } from '../../common/api-error';
import type { AnalysisResponse } from '../types/analyze.types';
import { ReportStoreService } from './report-store.service';

@Injectable()
export class ReportService {
  constructor(private readonly reportStore: ReportStoreService) {}

  getHtml(requestId: string): string {
    return this.renderHtml(this.getResultOrThrow(requestId));
  }

  async getPdf(requestId: string): Promise<Uint8Array> {
    const result = this.getResultOrThrow(requestId);
    return this.renderPdf(result);
  }

  private renderHtml(result: AnalysisResponse): string {
    const competitorRows = result.mapData.competitorsTop
      .map(
        (competitor) => `
          <tr>
            <td>${this.escape(competitor.name)}</td>
            <td>${competitor.rating ?? 'N/A'}</td>
            <td>${competitor.user_ratings_total}</td>
            <td>${competitor.price_level ?? 'N/A'}</td>
            <td>${competitor.distance_m}m</td>
          </tr>
        `,
      )
      .join('');

    const insightRows = result.insights
      .map((insight) => `<li>${this.escape(insight)}</li>`)
      .join('');

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reporte ${result.requestId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    .row { display: flex; gap: 16px; margin-bottom: 16px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>Reporte de pre-factibilidad</h1>
  <p><strong>Request:</strong> ${result.requestId}</p>
  <p><strong>Dirección:</strong> ${this.escape(result.input.address)}</p>
  <p><strong>Categoría:</strong> ${result.input.businessCategory}</p>
  <p><strong>Viability Score:</strong> ${result.viabilityScore} (${result.verdict})</p>

  <div class="row">
    <div class="card"><strong>Competencia</strong><br/>${result.metrics.competitionScore}/100</div>
    <div class="card"><strong>Demanda</strong><br/>${result.metrics.demandScore}/100</div>
    <div class="card"><strong>Diferenciación</strong><br/>${result.metrics.differentiationScore}/100</div>
  </div>

  <h2>Resumen</h2>
  <p>${this.escape(result.diagnosis)}</p>

  <h2>Insights</h2>
  <ul>${insightRows}</ul>

  <h2>Top 10 competidores</h2>
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Rating</th>
        <th>Reseñas</th>
        <th>Price level</th>
        <th>Distancia</th>
      </tr>
    </thead>
    <tbody>
      ${competitorRows}
    </tbody>
  </table>
</body>
</html>`;
  }

  private escape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private getResultOrThrow(requestId: string): AnalysisResponse {
    const result = this.reportStore.get(requestId);
    if (!result) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'REPORT_NOT_FOUND',
        'No existe reporte para el requestId indicado.',
        { requestId },
      );
    }

    return result;
  }

  private async renderPdf(result: AnalysisResponse): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const pageSize: [number, number] = [595.28, 841.89];
    const margin = 44;
    const maxWidth = pageSize[0] - margin * 2;
    let page = pdf.addPage(pageSize);
    let y = page.getHeight() - margin;

    const ensureSpace = (neededHeight: number): void => {
      if (y - neededHeight >= margin) {
        return;
      }

      page = pdf.addPage(pageSize);
      y = page.getHeight() - margin;
    };

    const drawWrapped = (
      text: string,
      options?: {
        fontSize?: number;
        isBold?: boolean;
        color?: [number, number, number];
        lineHeight?: number;
      },
    ): void => {
      const fontSize = options?.fontSize ?? 11;
      const lineHeight = options?.lineHeight ?? Math.round(fontSize * 1.35);
      const font = options?.isBold ? bold : regular;
      const color = options?.color ? rgb(...options.color) : rgb(0.08, 0.11, 0.18);
      const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);

      if (words.length === 0) {
        y -= lineHeight;
        return;
      }

      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        const fits = font.widthOfTextAtSize(candidate, fontSize) <= maxWidth;

        if (fits) {
          line = candidate;
          continue;
        }

        ensureSpace(lineHeight);
        page.drawText(line, { x: margin, y, size: fontSize, font, color });
        y -= lineHeight;
        line = word;
      }

      if (line) {
        ensureSpace(lineHeight);
        page.drawText(line, { x: margin, y, size: fontSize, font, color });
        y -= lineHeight;
      }
    };

    const spacer = (height = 8): void => {
      y -= height;
    };

    const formatAvgTicket = (): string =>
      result.input.avgTicket === undefined ? 'No informado' : String(result.input.avgTicket);

    const formatRating = (rating: number | null): string => (rating === null ? 'N/A' : rating.toFixed(1));

    drawWrapped('Reporte de viabilidad comercial', {
      fontSize: 20,
      isBold: true,
      color: [0.02, 0.24, 0.45],
      lineHeight: 28,
    });
    drawWrapped(`Request ID: ${result.requestId}`, { fontSize: 10, color: [0.35, 0.4, 0.48] });
    drawWrapped(`Generado: ${new Date(result.generatedAt).toLocaleString('es-AR')}`, {
      fontSize: 10,
      color: [0.35, 0.4, 0.48],
    });
    spacer(10);

    drawWrapped('Contexto del analisis', { fontSize: 13, isBold: true, color: [0.04, 0.19, 0.36] });
    drawWrapped(`Direccion solicitada: ${result.input.address}`);
    drawWrapped(`Direccion resuelta: ${result.location.formattedAddress}`);
    drawWrapped(`Rubro: ${result.input.businessCategory}`);
    drawWrapped(`Ticket promedio: ${formatAvgTicket()}`);
    spacer();

    drawWrapped('Resultado', { fontSize: 13, isBold: true, color: [0.04, 0.19, 0.36] });
    drawWrapped(`Puntaje de viabilidad: ${Math.round(result.viabilityScore)}/100`);
    drawWrapped(`Veredicto: ${result.verdict}`);
    drawWrapped(`Diagnostico: ${result.diagnosis}`);
    spacer();

    drawWrapped('Metricas principales', { fontSize: 13, isBold: true, color: [0.04, 0.19, 0.36] });
    drawWrapped(`Competencia local: ${Math.round(result.metrics.competitionScore)}/100`);
    drawWrapped(`Demanda potencial: ${Math.round(result.metrics.demandScore)}/100`);
    drawWrapped(`Oportunidad de diferenciacion: ${Math.round(result.metrics.differentiationScore)}/100`);
    drawWrapped(`Competidores directos (800m): ${result.hardMetrics.count_same_800m}`);
    drawWrapped(`Densidad total de negocios (800m): ${result.hardMetrics.density_all_800m}`);
    spacer();

    drawWrapped('Insights accionables', { fontSize: 13, isBold: true, color: [0.04, 0.19, 0.36] });
    result.insights.forEach((insight, index) => {
      drawWrapped(`${index + 1}. ${insight}`);
    });
    spacer();

    drawWrapped('Competidores cercanos (top 8)', { fontSize: 13, isBold: true, color: [0.04, 0.19, 0.36] });
    result.mapData.competitorsTop.slice(0, 8).forEach((competitor, index) => {
      drawWrapped(
        `${index + 1}. ${competitor.name} | Rating: ${formatRating(competitor.rating)} | Reseñas: ${competitor.user_ratings_total} | Precio: ${competitor.price_level ?? 'N/A'} | Distancia: ${competitor.distance_m}m`,
      );
    });

    return pdf.save();
  }
}
