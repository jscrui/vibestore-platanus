import { Injectable } from '@nestjs/common';

import type {
  GoogleDetailsResponse,
  GoogleGeocodeResponse,
  GoogleNearbyResponse,
  GooglePlaceDetailsResult,
  GooglePlaceSummary,
} from './google.types';
import type { GeocodeResult, PlaceSummary } from './places.models';

@Injectable()
export class PlacesMapper {
  mapGeocode(payload: GoogleGeocodeResponse): GeocodeResult | null {
    const candidate = payload.results?.[0];
    if (!candidate?.geometry?.location) {
      return null;
    }

    return {
      lat: candidate.geometry.location.lat,
      lng: candidate.geometry.location.lng,
      formattedAddress: candidate.formatted_address,
      placeId: candidate.place_id,
    };
  }

  mapNearby(payload: GoogleNearbyResponse, fallback: { lat: number; lng: number }): PlaceSummary[] {
    return (payload.results ?? [])
      .filter((place) => Boolean(place.place_id))
      .map((place) => this.fromGooglePlaceSummary(place, fallback));
  }

  mapDetails(payload: GoogleDetailsResponse): PlaceSummary | null {
    if (!payload.result?.place_id) {
      return null;
    }

    return this.fromGooglePlaceDetail(payload.result);
  }

  private fromGooglePlaceSummary(
    place: GooglePlaceSummary,
    fallback: { lat: number; lng: number },
  ): PlaceSummary {
    return {
      placeId: place.place_id,
      name: place.name,
      rating: place.rating ?? null,
      userRatingsTotal: place.user_ratings_total ?? 0,
      priceLevel: place.price_level ?? null,
      types: place.types ?? [],
      businessStatus: place.business_status ?? null,
      lat: place.geometry?.location?.lat ?? fallback.lat,
      lng: place.geometry?.location?.lng ?? fallback.lng,
    };
  }

  private fromGooglePlaceDetail(place: GooglePlaceDetailsResult): PlaceSummary {
    return {
      placeId: place.place_id,
      name: place.name ?? 'Unknown',
      rating: place.rating ?? null,
      userRatingsTotal: place.user_ratings_total ?? 0,
      priceLevel: place.price_level ?? null,
      types: place.types ?? [],
      businessStatus: place.business_status ?? null,
      lat: place.geometry?.location?.lat ?? 0,
      lng: place.geometry?.location?.lng ?? 0,
    };
  }
}
