import { Injectable } from '@nestjs/common';

import type { BusinessCategory, Verdict } from '../../analysis/constants/business-category';
import type { HardMetrics, InsightPack } from '../../analysis/types/analyze.types';

@Injectable()
export class InsightsFallbackService {
  generate(params: {
    businessCategory: BusinessCategory;
    formattedAddress: string;
    hardMetrics: HardMetrics;
    finalScore: number;
    verdict: Verdict;
  }): InsightPack {
    const recommendationAngle = params.hardMetrics.detected_price_gap.isGap
      ? 'pricing'
      : 'specialty';

    return {
      bullets: [
        `Competidores directos en 800m: ${params.hardMetrics.count_same_800m}; en 1500m: ${params.hardMetrics.count_same_1500m}.`,
        `La densidad comercial de 800m es ${params.hardMetrics.density_all_800m} lugares y acumula ${params.hardMetrics.total_reviews_all_800m} reseñas.`,
        `Calidad competitiva: rating promedio ${params.hardMetrics.avg_rating_same} con mediana de ${params.hardMetrics.median_reviews_same} reseñas.`,
        `Distribución de precio detectada: ${JSON.stringify(params.hardMetrics.price_level_distribution)}.`,
        params.hardMetrics.detected_price_gap.isGap
          ? `Hay gap de precio (${params.hardMetrics.detected_price_gap.dominant} dominante); conviene testear ${params.hardMetrics.detected_price_gap.suggested}.`
          : 'No se detecta gap de precio contundente; la propuesta debe diferenciarse por experiencia y ejecución.',
      ],
      summary: `Para ${params.businessCategory} en ${params.formattedAddress}, el score final es ${params.finalScore}/100 con dictamen ${params.verdict}. La decisión se explica por saturación local, fuerza de competidores y demanda proxy observada en reseñas y densidad comercial.`,
      recommendationAngle,
    };
  }
}
