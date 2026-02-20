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

export interface AnalyzeRequest {
  address: string;
  businessCategory: BusinessCategory;
  avgTicket?: TicketBucket | number;
  countryBias?: string;
  placeId?: string;
}

export interface AnalyzeResponse {
  requestId: string;
  input: {
    address: string;
    businessCategory: BusinessCategory;
    avgTicket?: TicketBucket | number;
    countryBias: string;
  };
  location: {
    lat: number;
    lng: number;
    formattedAddress: string;
    placeId?: string;
  };
  viabilityScore: number;
  verdict: Verdict;
  metrics: {
    competitionScore: number;
    demandScore: number;
    differentiationScore: number;
  };
  hardMetrics: {
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
  };
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

interface ApiErrorShape {
  message?: string;
  errorCode?: string;
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
).replace(/\/+$/, '');

const ANALYZE_URL = API_URL.endsWith('/api')
  ? `${API_URL}/analyze`
  : `${API_URL}/api/analyze`;

const API_ORIGIN = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

export function buildReportUrl(reportPath: string): string {
  if (/^https?:\/\//i.test(reportPath)) {
    return reportPath;
  }

  return `${API_ORIGIN}${reportPath.startsWith('/') ? reportPath : `/${reportPath}`}`;
}

export async function runAnalysis(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const response = await fetch(ANALYZE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = `Analysis request failed with status ${response.status}`;

    try {
      const body = (await response.json()) as ApiErrorShape;
      if (body.message) {
        message = body.message;
      }
    } catch {
      // ignore parse errors and keep fallback message
    }

    throw new Error(message);
  }

  return response.json() as Promise<AnalyzeResponse>;
}
