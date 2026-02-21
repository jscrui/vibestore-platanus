export type BusinessCategory =
  | 'CAFE'
  | 'BAR'
  | 'RESTAURANT'
  | 'KIOSK'
  | 'GYM'
  | 'HAIR_SALON'
  | 'PHARMACY'
  | 'PET_SHOP'
  | 'LAUNDRY'
  | 'ELECTRONICS_REPAIR'
  | 'BEAUTY_SALON'
  | 'DENTIST'
  | 'SUPERMARKET'
  | 'CLOTHING'
  | 'BOOKSTORE'
  | 'CO_WORKING';

export type TicketBucket = 'low' | 'mid' | 'high';
export type Verdict = 'OPEN' | 'OPEN_WITH_CONDITIONS' | 'DO_NOT_OPEN';
export type ChatSessionStatus = 'ACTIVE' | 'COMPLETED' | 'CLOSED';
export type ChatRequiredField = 'address' | 'businessCategory' | 'avgTicket';

export interface AnalyzeRequest {
  address: string;
  businessCategory: BusinessCategory;
  avgTicket?: TicketBucket | number;
  countryBias?: string;
  placeId?: string;
}

export interface ChatMessageRequest {
  sessionId: string;
  message: string;
}

export interface ChatCollectedData {
  address?: string;
  businessCategory?: BusinessCategory;
  avgTicket?: number;
}

export interface ChatAnalysisPayload {
  address: string;
  businessCategory: BusinessCategory;
  avgTicket: number;
  countryBias: string;
}

export interface ChatResponse {
  sessionId: string;
  sessionStatus: ChatSessionStatus;
  assistantMessage: string;
  invalidAttempts: number;
  remainingInvalidAttempts: number;
  missingFields: ChatRequiredField[];
  readyForAnalysis: boolean;
  collectedData: ChatCollectedData;
  analysisPayload?: ChatAnalysisPayload;
}

export interface AnalyzeLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
}

export interface AnalyzeMetrics {
  competitionScore: number;
  demandScore: number;
  differentiationScore: number;
}

export interface PriceGap {
  isGap: boolean;
  suggested?: string;
  dominant?: string;
  detail?: string;
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
  detected_price_gap: PriceGap;
}

export interface CompetitorTop {
  place_id: string;
  name: string;
  rating: number | null;
  user_ratings_total: number;
  price_level: number | null;
  types: string[];
  distance_m: number;
}

export interface AnalyzeMapData {
  center: { lat: number; lng: number };
  competitorsTop: CompetitorTop[];
}

export interface AnalyzeResponse {
  requestId: string;
  input: {
    address: string;
    businessCategory: BusinessCategory;
    avgTicket?: TicketBucket | number;
    countryBias: string;
  };
  location: AnalyzeLocation;
  viabilityScore: number;
  verdict: Verdict;
  metrics: AnalyzeMetrics;
  hardMetrics: HardMetrics;
  insights: string[];
  diagnosis: string;
  recommendationAngle: string;
  mapData: AnalyzeMapData;
  report: {
    reportUrl: string;
    pdfUrl: string | null;
  };
  timingMs: {
    geocode: number;
    nearby: number;
    details: number;
    score: number;
    llm: number;
    total: number;
  };
  generatedAt: string;
  cacheHit: boolean;
}
