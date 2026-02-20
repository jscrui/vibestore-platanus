import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiError } from '../../common/api-error';
import type { AnalysisResponse } from '../types/analyze.types';
import { ReportStoreService } from './report-store.service';

@Injectable()
export class ReportService {
  constructor(private readonly reportStore: ReportStoreService) {}

  getHtml(requestId: string): string {
    const result = this.reportStore.get(requestId);
    if (!result) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'REPORT_NOT_FOUND',
        'No existe reporte para el requestId indicado.',
        { requestId },
      );
    }

    return this.renderHtml(result);
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
}
