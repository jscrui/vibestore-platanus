import type { BusinessCategory, TicketBucket, Verdict } from '../constants/business-category';

export interface NormalizedInput {
  addressRaw: string;
  addressNormalized: string;
  businessCategory: BusinessCategory;
  avgTicket?: string | number;
  ticketBucket?: TicketBucket;
  countryBias: string;
  placeId?: string;
}

export interface ResolvedLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
}

export interface PlaceRecord {
  placeId: string;
  name: string;
  rating: number | null;
  userRatingsTotal: number;
  priceLevel: number | null;
  types: string[];
  businessStatus: string | null;
  lat: number;
  lng: number;
  distanceM: number;
}

export interface HardMetrics {
  count_same_800m: number;
  count_same_1500m: number;
  density_all_800m: number;
  avg_rating_same: number;
  median_reviews_same: number;
  total_reviews_all_800m: number;
  count_food_drink_800m: number;
  price_level_distribution: Record<string, number>;
  detected_price_gap: {
    isGap: boolean;
    suggested?: string;
    dominant?: string;
    detail?: string;
  };
}

export interface Metrics {
  competitionScore: number;
  demandScore: number;
  differentiationScore: number;
}

export interface ScoreComputation {
  viabilityScore: number;
  verdict: Verdict;
  metrics: Metrics;
  internal: {
    saturationPenalty: number;
    competitorStrengthPenalty: number;
    demandBonus: number;
    differentiationBonus: number;
  };
}

export interface InsightPack {
  bullets: string[];
  summary: string;
  recommendationAngle: 'specialty' | 'take-away' | 'hours' | 'pricing' | 'niche-audience';
}

export interface AnalyzeTiming {
  geocode: number;
  nearby: number;
  details: number;
  score: number;
  llm: number;
  total: number;
}

export interface AnalysisResponse {
  requestId: string;
  input: {
    address: string;
    businessCategory: BusinessCategory;
    avgTicket?: string | number;
    countryBias: string;
  };
  location: ResolvedLocation;
  viabilityScore: number;
  verdict: Verdict;
  metrics: Metrics;
  hardMetrics: HardMetrics;
  competitorsTop: Array<{
    place_id: string;
    name: string;
    rating: number | null;
    user_ratings_total: number;
    price_level: number | null;
    types: string[];
    distance_m: number;
  }>;
  insights: string[];
  diagnosis: string;
  recommendationAngle: string;
  mapData: {
    center: { lat: number; lng: number };
    competitorsTop: Array<{
      place_id: string;
      name: string;
      rating: number | null;
      user_ratings_total: number;
      price_level: number | null;
      types: string[];
      distance_m: number;
    }>;
  };
  report: {
    reportUrl: string;
    pdfUrl: string | null;
  };
  timingMs: AnalyzeTiming;
  generatedAt: string;
  cacheHit: boolean;
}
