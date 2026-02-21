import { Injectable } from '@nestjs/common';

import type { HardMetrics, Metrics, ScoreComputation } from '../../analysis/types/analyze.types';
import { clamp } from '../../analysis/utils/math';

export interface ScoreEngineResult {
  viabilityScore: number;
  metrics: Metrics;
  internal: ScoreComputation['internal'];
}

@Injectable()
export class ScoreEngineService {
  compute(hardMetrics: HardMetrics): ScoreEngineResult {
    const saturationPenalty = clamp(
      Math.sqrt(hardMetrics.count_same_800m) * 3.5 +
        Math.sqrt(hardMetrics.count_same_1500m) * 2.0,
      0,
      40,
    );

    const competitorStrengthPenalty = clamp(
      (hardMetrics.avg_rating_same - 4.0) * 10 +
        Math.log1p(hardMetrics.median_reviews_same) * 1.5,
      0,
      18,
    );

    const demandBonus = clamp(
      Math.log1p(hardMetrics.total_reviews_all_800m) * 1.5 +
        hardMetrics.density_all_800m * 0.15,
      0,
      22,
    );

    const differentiationSignal = this.computeDifferentiationSignal(hardMetrics);
    const differentiationBonus = clamp(differentiationSignal, 0, 10);

    const viabilityScore = Math.round(
      clamp(
        100 - saturationPenalty - competitorStrengthPenalty + demandBonus + differentiationBonus,
        0,
        100,
      ),
    );

    const competitionBadness = clamp(
      saturationPenalty + competitorStrengthPenalty,
      0,
      70,
    );

    const competitionScore = 100 - Math.round((competitionBadness / 70) * 100);
    const demandScore = Math.round((demandBonus / 22) * 100);
    const differentiationScore = Math.round((differentiationBonus / 10) * 100);

    return {
      viabilityScore,
      metrics: {
        competitionScore,
        demandScore,
        differentiationScore,
      },
      internal: {
        saturationPenalty,
        competitorStrengthPenalty,
        demandBonus,
        differentiationBonus,
      },
    };
  }

  private computeDifferentiationSignal(hardMetrics: HardMetrics): number {
    let score = 2;

    if (hardMetrics.detected_price_gap.isGap) {
      score += 6;
    }

    const dominant = hardMetrics.detected_price_gap.dominant;
    if (dominant && (dominant === '2-3' || dominant === '4')) {
      score += 1;
    }

    if (hardMetrics.count_same_800m <= 8) {
      score += 1;
    }

    return score;
  }
}
