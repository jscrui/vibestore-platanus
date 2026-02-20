export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
}

export interface PlaceSummary {
  placeId: string;
  name: string;
  rating: number | null;
  userRatingsTotal: number;
  priceLevel: number | null;
  types: string[];
  businessStatus: string | null;
  lat: number;
  lng: number;
}
