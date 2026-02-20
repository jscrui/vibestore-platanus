import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import {
  CATEGORY_CONFIG,
  type BusinessCategory,
  normalizeTicketBucket,
} from './constants/business-category';
import type { AnalyzeRequestDto } from './dto/analysis.dto';
import { AnalysisCacheService } from './services/cache.service';
import { FeaturesService } from './services/features.service';
import { InsightsService } from './services/insights.service';
import { PlacesService, type PlaceSummary } from './services/places.service';
import { ReportStoreService } from './services/report-store.service';
import { ScoringService } from './services/scoring.service';
import type {
  AnalysisResponse,
  HardMetrics,
  NormalizedInput,
  PlaceRecord,
  ResolvedLocation,
} from './types/analyze.types';
import { mapWithConcurrency } from './utils/async';
import { distanceInMeters } from './utils/geo';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly placesService: PlacesService,
    private readonly featuresService: FeaturesService,
    private readonly scoringService: ScoringService,
    private readonly insightsService: InsightsService,
    private readonly cacheService: AnalysisCacheService,
    private readonly reportStore: ReportStoreService,
  ) {}

  async analyze(body: AnalyzeRequestDto): Promise<AnalysisResponse> {
    const startedAt = Date.now();
    const normalizedInput = this.normalizeInput(body);
    const cacheKey = this.buildCacheKey(normalizedInput);

    const cached = this.cacheService.get<AnalysisResponse>(cacheKey);
    if (cached) {
      const cachedResponse = { ...cached, cacheHit: true };
      this.reportStore.save(cachedResponse);
      return cachedResponse;
    }

    const timings = {
      geocode: 0,
      nearby: 0,
      details: 0,
      score: 0,
      llm: 0,
      total: 0,
    };

    const geocodeStart = Date.now();
    const location = await this.placesService.geocode({
      address: normalizedInput.addressNormalized,
      placeId: normalizedInput.placeId,
      countryBias: normalizedInput.countryBias,
    });
    timings.geocode = Date.now() - geocodeStart;

    const categoryConfig = CATEGORY_CONFIG[normalizedInput.businessCategory];

    const nearbyStart = Date.now();
    const [all800Summaries, same800Summaries, same1500Summaries] = await Promise.all([
      this.placesService.nearbySearch({
        lat: location.lat,
        lng: location.lng,
        radiusM: 800,
      }),
      this.searchSameCategory(location, categoryConfig.primaryTypes, categoryConfig.keyword, 800),
      this.searchSameCategory(location, categoryConfig.primaryTypes, categoryConfig.keyword, 1500),
    ]);
    timings.nearby = Date.now() - nearbyStart;

    const all800 = this.mapSummariesToRecords(all800Summaries, location);
    const same800 = this.mapSummariesToRecords(same800Summaries, location).filter(
      (place) => place.businessStatus !== 'CLOSED_PERMANENTLY',
    );

    const detailsStart = Date.now();
    const detailsLimit = Number(process.env.DETAILS_LIMIT ?? 20);
    const detailsConcurrency = Number(process.env.DETAILS_CONCURRENCY ?? 5);

    const candidatesForDetails = [...same1500Summaries]
      .filter((place) => place.businessStatus !== 'CLOSED_PERMANENTLY')
      .sort((a, b) => b.userRatingsTotal - a.userRatingsTotal)
      .slice(0, detailsLimit);

    const detailedPlaces = await mapWithConcurrency(
      candidatesForDetails,
      detailsConcurrency,
      async (place) => {
        const details = await this.placesService.placeDetails(place.placeId);
        if (!details) {
          return this.summaryToRecord(place, location);
        }

        return this.summaryToRecord(details, location);
      },
    );

    const same1500 = detailedPlaces.filter(
      (place) => place.businessStatus !== 'CLOSED_PERMANENTLY',
    );

    timings.details = Date.now() - detailsStart;

    const scoreStart = Date.now();
    const hardMetrics = this.featuresService.buildHardMetrics({
      same800,
      same1500,
      all800,
      ticketBucket: normalizedInput.ticketBucket,
      isFoodCategory: categoryConfig.isFood,
    });

    const scoring = this.scoringService.compute(hardMetrics);
    timings.score = Date.now() - scoreStart;

    const llmStart = Date.now();
    const insights = await this.insightsService.generate({
      businessCategory: normalizedInput.businessCategory,
      formattedAddress: location.formattedAddress,
      hardMetrics,
      finalScore: scoring.viabilityScore,
      verdict: scoring.verdict,
    });
    timings.llm = Date.now() - llmStart;

    const requestId = this.createRequestId();

    const competitorsTop = same1500
      .sort((a, b) => b.userRatingsTotal - a.userRatingsTotal)
      .slice(0, 10)
      .map((place) => ({
        place_id: place.placeId,
        name: place.name,
        rating: place.rating,
        user_ratings_total: place.userRatingsTotal,
        price_level: place.priceLevel,
        types: place.types,
        distance_m: place.distanceM,
      }));

    const response: AnalysisResponse = {
      requestId,
      input: {
        address: normalizedInput.addressNormalized,
        businessCategory: normalizedInput.businessCategory,
        avgTicket: normalizedInput.avgTicket,
        countryBias: normalizedInput.countryBias,
      },
      location,
      viabilityScore: scoring.viabilityScore,
      verdict: scoring.verdict,
      metrics: scoring.metrics,
      hardMetrics,
      competitorsTop,
      insights: insights.bullets,
      diagnosis: insights.summary,
      recommendationAngle: insights.recommendationAngle,
      mapData: {
        center: {
          lat: location.lat,
          lng: location.lng,
        },
        competitorsTop,
      },
      report: {
        reportUrl: `/api/report/${requestId}`,
        pdfUrl: null,
      },
      timingMs: {
        ...timings,
        total: Date.now() - startedAt,
      },
      generatedAt: new Date().toISOString(),
      cacheHit: false,
    };

    const ttlSeconds = Number(process.env.CACHE_TTL_SECONDS ?? 86400);
    this.cacheService.set(cacheKey, response, ttlSeconds);
    this.reportStore.save(response);

    return response;
  }

  private normalizeInput(body: AnalyzeRequestDto): NormalizedInput {
    const normalizedAddress = body.address.trim().replace(/\s+/g, ' ');

    return {
      addressRaw: body.address,
      addressNormalized: normalizedAddress,
      businessCategory: body.businessCategory,
      avgTicket: body.avgTicket,
      ticketBucket: normalizeTicketBucket(body.avgTicket),
      countryBias: (body.countryBias ?? 'AR').trim().toUpperCase(),
      placeId: body.placeId?.trim(),
    };
  }

  private buildCacheKey(input: NormalizedInput): string {
    const payload = [
      input.addressNormalized.toLowerCase(),
      input.placeId ?? '',
      input.businessCategory,
      input.ticketBucket ?? '',
      input.countryBias,
    ].join('|');

    return createHash('sha256').update(payload).digest('hex');
  }

  private createRequestId(): string {
    return `req_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  }

  private async searchSameCategory(
    location: ResolvedLocation,
    types: string[],
    keyword: string | undefined,
    radiusM: number,
  ): Promise<PlaceSummary[]> {
    const searches = [
      ...types.map((type) =>
        this.placesService.nearbySearch({
          lat: location.lat,
          lng: location.lng,
          radiusM,
          type,
        }),
      ),
    ];

    if (keyword) {
      searches.push(
        this.placesService.nearbySearch({
          lat: location.lat,
          lng: location.lng,
          radiusM,
          keyword,
        }),
      );
    }

    const results = await Promise.all(searches);
    const dedup = new Map<string, PlaceSummary>();

    for (const list of results) {
      for (const place of list) {
        dedup.set(place.placeId, place);
      }
    }

    return [...dedup.values()];
  }

  private mapSummariesToRecords(
    places: PlaceSummary[],
    location: ResolvedLocation,
  ): PlaceRecord[] {
    return places.map((place) => this.summaryToRecord(place, location));
  }

  private summaryToRecord(place: PlaceSummary, location: ResolvedLocation): PlaceRecord {
    return {
      placeId: place.placeId,
      name: place.name,
      rating: place.rating,
      userRatingsTotal: place.userRatingsTotal,
      priceLevel: place.priceLevel,
      types: place.types,
      businessStatus: place.businessStatus,
      lat: place.lat,
      lng: place.lng,
      distanceM: distanceInMeters(
        { lat: location.lat, lng: location.lng },
        { lat: place.lat, lng: place.lng },
      ),
    };
  }
}
