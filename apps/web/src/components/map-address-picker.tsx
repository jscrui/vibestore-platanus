'use client';

import { divIcon, type LeafletEvent } from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

export interface MapLocationSelection {
  lat: number;
  lng: number;
  address: string;
  countryCode?: string;
}

interface MapAddressPickerProps {
  onSelect: (location: MapLocationSelection) => void;
}

const DEFAULT_CENTER = { lat: -34.58187, lng: -58.4053 };

function MapClickCapture({
  onPick,
}: {
  onPick: (position: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

export default function MapAddressPicker({ onSelect }: MapAddressPickerProps) {
  const [position, setPosition] = useState(DEFAULT_CENTER);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const markerIcon = useMemo(
    () =>
      divIcon({
        className: 'map-pin-marker',
        html: '<span></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      }),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsResolvingAddress(true);
      setResolveError(null);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.lat}&lon=${position.lng}&addressdetails=1`,
          {
            signal: controller.signal,
            headers: {
              'Accept-Language': 'es',
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Reverse geocode failed with status ${response.status}`);
        }

        const payload = (await response.json()) as {
          display_name?: string;
          address?: { country_code?: string };
        };

        onSelect({
          lat: position.lat,
          lng: position.lng,
          address: payload.display_name ?? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`,
          countryCode: payload.address?.country_code?.toUpperCase(),
        });
      } catch {
        setResolveError('No se pudo obtener dirección automáticamente para este punto.');
        onSelect({
          lat: position.lat,
          lng: position.lng,
          address: `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`,
        });
      } finally {
        setIsResolvingAddress(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [onSelect, position]);

  return (
    <div className="map-card">
      <div className="map-card-head">
        <p className="map-card-title">Selector de direccion</p>
        <p className="map-card-subtitle">
          Arrastra el pin o haz click en el mapa para fijar la ubicacion objetivo.
        </p>
      </div>

      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom
        className="map-container"
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <Marker
          position={position}
          draggable
          icon={markerIcon}
          eventHandlers={{
            dragend: (event: LeafletEvent) => {
              const marker = event.target as { getLatLng: () => { lat: number; lng: number } };
              const next = marker.getLatLng();
              setPosition({ lat: next.lat, lng: next.lng });
            },
          }}
        />
        <MapClickCapture onPick={setPosition} />
      </MapContainer>

      <div className="map-meta">
        <p>
          Lat: {position.lat.toFixed(5)} | Lng: {position.lng.toFixed(5)}
        </p>
        {isResolvingAddress ? <p>Resolviendo direccion...</p> : null}
        {resolveError ? <p className="map-error">{resolveError}</p> : null}
      </div>
    </div>
  );
}
