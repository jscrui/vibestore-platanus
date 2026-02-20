import { Injectable } from '@nestjs/common';

import type { TicketBucket } from '../../analysis/constants/business-category';
import type { HardMetrics, PlaceRecord } from '../../analysis/types/analyze.types';
import { median, round2 } from '../../analysis/utils/math';

const FOOD_TYPES = new Set([
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'meal_takeaway',
]);

@Injectable()
export class FeaturesBuilderService {
  buildHardMetrics(params: {
    same800: PlaceRecord[];
    same1500: PlaceRecord[];
    all800: PlaceRecord[];
    ticketBucket?: TicketBucket;
    isFoodCategory: boolean;
  }): HardMetrics {
    const ratings = params.same1500
      .map((place) => place.rating)
      .filter((value): value is number => value !== null);

    const reviews = params.same1500
      .map((place) => place.userRatingsTotal)
      .filter((value) => Number.isFinite(value));

    const priceDistribution = this.buildPriceDistribution(params.same1500);
    const priceGap = this.detectPriceGap(priceDistribution, params.ticketBucket);

    return {
      count_same_800m: params.same800.length,
      count_same_1500m: params.same1500.length,
      density_all_800m: params.all800.length,
      avg_rating_same: ratings.length > 0 ? round2(ratings.reduce((a, b) => a + b, 0) / ratings.length) : 4.0,
      median_reviews_same: median(reviews),
      total_reviews_all_800m: params.all800.reduce(
        (sum, place) => sum + place.userRatingsTotal,
        0,
      ),
      count_food_drink_800m: params.isFoodCategory
        ? params.all800.filter((place) =>
            place.types.some((type) => FOOD_TYPES.has(type)),
          ).length
        : 0,
      price_level_distribution: priceDistribution,
      detected_price_gap: priceGap,
    };
  }

  private buildPriceDistribution(places: PlaceRecord[]): Record<string, number> {
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0 };

    for (const place of places) {
      if (place.priceLevel === null) {
        continue;
      }

      const normalized = Math.max(1, Math.min(4, place.priceLevel));
      distribution[String(normalized)] += 1;
    }

    return distribution;
  }

  private detectPriceGap(
    distribution: Record<string, number>,
    ticketBucket?: TicketBucket,
  ): HardMetrics['detected_price_gap'] {
    const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
    if (total === 0) {
      return {
        isGap: false,
        detail: 'Sin señal suficiente de price_level en competidores.',
      };
    }

    const bands: Record<string, number> = {
      '1': distribution['1'] ?? 0,
      '2-3': (distribution['2'] ?? 0) + (distribution['3'] ?? 0),
      '4': distribution['4'] ?? 0,
    };

    const dominant = Object.entries(bands).sort((a, b) => b[1] - a[1])[0];
    const dominantBand = dominant[0];
    const dominantShare = dominant[1] / total;

    const suggestedBand = this.ticketToBand(ticketBucket);
    const suggestedCount = suggestedBand ? bands[suggestedBand] ?? 0 : 0;

    const isGap =
      dominantShare >= 0.6 &&
      !!suggestedBand &&
      (suggestedBand !== dominantBand || suggestedCount / total <= 0.15);

    if (!isGap) {
      return {
        isGap: false,
        suggested: suggestedBand ?? undefined,
        dominant: dominantBand,
        detail: 'No se detecta gap claro de precio contra la oferta dominante.',
      };
    }

    return {
      isGap: true,
      suggested: suggestedBand ?? undefined,
      dominant: dominantBand,
      detail: `La franja ${dominantBand} domina la zona; hay ventana para ${suggestedBand ?? 'segmento alternativo'}.`,
    };
  }

  private ticketToBand(ticketBucket?: TicketBucket): '1' | '2-3' | '4' | undefined {
    if (!ticketBucket) {
      return undefined;
    }

    if (ticketBucket === 'low') {
      return '1';
    }

    if (ticketBucket === 'mid') {
      return '2-3';
    }

    return '4';
  }
}
