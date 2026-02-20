export type Verdict = 'abrir' | 'abrir_con_condiciones' | 'no_abrir';

export interface AnalysisRequest {
  address: string;
  businessCategory: string;
  averageTicket?: number;
}

export interface ScoreBreakdown {
  competition: number;
  competitorStrength: number;
  demandProxy: number;
  differentiationOpportunity: number;
}

export interface NearbyCompetitor {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number;
  distanceMeters: number;
  lat: number;
  lng: number;
}

export interface AnalysisMetrics {
  searchRadiusMeters: number;
  totalCompetitors: number;
  highRatedCompetitors: number;
  avgCompetitorRating: number | null;
  avgReviews: number;
}

export interface AnalysisResult {
  request: AnalysisRequest;
  viabilityScore: number;
  verdict: Verdict;
  scoreBreakdown: ScoreBreakdown;
  metrics: AnalysisMetrics;
  competitors: NearbyCompetitor[];
  diagnosis: string;
  actionableInsights: string[];
  generatedAt: string;
  cacheHit: boolean;
}
