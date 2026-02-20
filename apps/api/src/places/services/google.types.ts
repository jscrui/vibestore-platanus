export interface GoogleBaseResponse {
  status: string;
  error_message?: string;
}

export interface GoogleGeocodeResult {
  formatted_address: string;
  place_id?: string;
  geometry: { location: { lat: number; lng: number } };
}

export interface GoogleGeocodeResponse extends GoogleBaseResponse {
  results?: GoogleGeocodeResult[];
}

export interface GooglePlaceSummary {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  business_status?: string;
  geometry?: { location?: { lat: number; lng: number } };
}

export interface GoogleNearbyResponse extends GoogleBaseResponse {
  results?: GooglePlaceSummary[];
}

export interface GooglePlaceDetailsResult {
  place_id: string;
  name?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  business_status?: string;
  geometry?: { location?: { lat: number; lng: number } };
}

export interface GoogleDetailsResponse extends GoogleBaseResponse {
  result?: GooglePlaceDetailsResult;
}
