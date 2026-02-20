import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiError } from '../../common/api-error';
import { PlacesClient } from '../../places/services/places-client.service';
import { PlacesMapper } from '../../places/services/places-mapper.service';
import type { GeocodeResult, PlaceSummary } from '../../places/services/places.models';

export type { GeocodeResult, PlaceSummary };

@Injectable()
export class PlacesService {
  constructor(
    private readonly placesClient: PlacesClient,
    private readonly placesMapper: PlacesMapper,
  ) {}

  async geocode(params: {
    address?: string;
    placeId?: string;
    countryBias: string;
  }): Promise<GeocodeResult> {
    const payload = await this.placesClient.geocode(params);
    const mapped = this.placesMapper.mapGeocode(payload);

    if (!mapped) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'ADDRESS_NOT_FOUND',
        'No se encontró una ubicación válida para la dirección.',
      );
    }

    return mapped;
  }

  async nearbySearch(params: {
    lat: number;
    lng: number;
    radiusM: number;
    type?: string;
    keyword?: string;
  }): Promise<PlaceSummary[]> {
    const payload = await this.placesClient.nearbySearch(params);
    return this.placesMapper.mapNearby(payload, {
      lat: params.lat,
      lng: params.lng,
    });
  }

  async placeDetails(placeId: string): Promise<PlaceSummary | null> {
    const payload = await this.placesClient.placeDetails(placeId);
    if (!payload) {
      return null;
    }

    return this.placesMapper.mapDetails(payload);
  }
}
