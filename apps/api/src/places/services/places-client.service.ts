import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiError } from '../../common/api-error';
import type {
  GoogleBaseResponse,
  GoogleDetailsResponse,
  GoogleGeocodeResponse,
  GoogleNearbyResponse,
} from './google.types';

@Injectable()
export class PlacesClient {
  private readonly apiKey =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;

  private readonly timeoutMs = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 10000);

  geocode(params: {
    address?: string;
    placeId?: string;
    countryBias: string;
  }): Promise<GoogleGeocodeResponse> {
    this.ensureApiKey();

    const query = new URLSearchParams({ key: this.apiKey! });

    if (params.placeId) {
      query.set('place_id', params.placeId);
    } else if (params.address) {
      query.set('address', params.address);
      query.set('components', `country:${params.countryBias}`);
    } else {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'ADDRESS_NOT_FOUND',
        'No se recibió address ni placeId para geocodificar.',
      );
    }

    return this.fetchAndValidate<GoogleGeocodeResponse>(
      `https://maps.googleapis.com/maps/api/geocode/json?${query.toString()}`,
      {
        notFoundCode: 'ADDRESS_NOT_FOUND',
        notFoundMessage: 'No se encontró una ubicación válida para la dirección.',
      },
    );
  }

  nearbySearch(params: {
    lat: number;
    lng: number;
    radiusM: number;
    type?: string;
    keyword?: string;
  }): Promise<GoogleNearbyResponse> {
    this.ensureApiKey();

    const query = new URLSearchParams({
      key: this.apiKey!,
      location: `${params.lat},${params.lng}`,
      radius: `${params.radiusM}`,
    });

    if (params.type) {
      query.set('type', params.type);
    }

    if (params.keyword) {
      query.set('keyword', params.keyword);
    }

    return this.fetchAndValidate<GoogleNearbyResponse>(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${query.toString()}`,
    );
  }

  async placeDetails(placeId: string): Promise<GoogleDetailsResponse | null> {
    this.ensureApiKey();

    const query = new URLSearchParams({
      key: this.apiKey!,
      place_id: placeId,
      fields:
        'place_id,name,rating,user_ratings_total,price_level,types,business_status,geometry/location',
    });

    const payload = await this.fetchJson<GoogleDetailsResponse>(
      `https://maps.googleapis.com/maps/api/place/details/json?${query.toString()}`,
    );

    if (payload.status === 'NOT_FOUND') {
      return null;
    }

    this.assertGoogleStatus(payload);
    return payload;
  }

  private ensureApiKey(): void {
    if (!this.apiKey) {
      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'PLACES_UPSTREAM_ERROR',
        'GOOGLE_MAPS_API_KEY no está configurada en el backend.',
      );
    }
  }

  private async fetchAndValidate<T extends GoogleBaseResponse>(
    url: string,
    options?: { notFoundCode?: string; notFoundMessage?: string },
  ): Promise<T> {
    const payload = await this.fetchJson<T>(url);
    this.assertGoogleStatus(payload, options);
    return payload;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: globalThis.Response;

    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(
          HttpStatus.GATEWAY_TIMEOUT,
          'TIMEOUT',
          'Timeout consultando proveedor externo.',
          { upstream: 'GOOGLE_PLACES', timeoutMs: this.timeoutMs },
        );
      }

      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'PLACES_UPSTREAM_ERROR',
        'No fue posible conectar con Google Places/Geocoding.',
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 429) {
      throw new ApiError(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMIT',
        'Se alcanzó el límite de Google Places.',
      );
    }

    if (!response.ok) {
      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'PLACES_UPSTREAM_ERROR',
        'Google Places/Geocoding devolvió un error HTTP.',
        { status: response.status },
      );
    }

    return (await response.json()) as T;
  }

  private assertGoogleStatus(
    payload: GoogleBaseResponse,
    options?: { notFoundCode?: string; notFoundMessage?: string },
  ): void {
    if (payload.status === 'OK' || payload.status === 'ZERO_RESULTS') {
      if (payload.status === 'ZERO_RESULTS' && options?.notFoundCode) {
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          options.notFoundCode,
          options.notFoundMessage ?? 'No se encontraron resultados.',
        );
      }

      return;
    }

    if (payload.status === 'OVER_QUERY_LIMIT') {
      throw new ApiError(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMIT',
        'Se alcanzó el límite de Google Places.',
      );
    }

    throw new ApiError(
      HttpStatus.BAD_GATEWAY,
      'PLACES_UPSTREAM_ERROR',
      'Google Places/Geocoding devolvió un estado no exitoso.',
      {
        status: payload.status,
        errorMessage: payload.error_message,
      },
    );
  }
}
