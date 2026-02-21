'use client';

import dynamic from 'next/dynamic';
import type { FormEvent } from 'react';

import type { BusinessCategory } from '../lib/api';
import type { CategoryOption } from '../lib/analyzer-ui';
import type { MapLocationSelection } from './map-address-picker';

const MapAddressPicker = dynamic(() => import('./map-address-picker'), {
  ssr: false,
  loading: () => <div className="map-loading">Cargando mapa...</div>,
});

export interface ViabilityFormValues {
  address: string;
  businessCategory: BusinessCategory;
  averageTicket: string;
  countryBias: string;
}

export interface ViabilityFormErrors {
  address?: string;
  averageTicket?: string;
}

interface ViabilityFormProps {
  values: ViabilityFormValues;
  errors: ViabilityFormErrors;
  categories: CategoryOption[];
  isSubmitting: boolean;
  submitError: string | null;
  selectedCategoryPitch?: string;
  onAddressChange: (address: string) => void;
  onBusinessCategoryChange: (businessCategory: BusinessCategory) => void;
  onAverageTicketChange: (averageTicket: string) => void;
  onLocationSelect: (location: MapLocationSelection) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ViabilityForm({
  values,
  errors,
  categories,
  isSubmitting,
  submitError,
  selectedCategoryPitch,
  onAddressChange,
  onBusinessCategoryChange,
  onAverageTicketChange,
  onLocationSelect,
  onSubmit,
}: ViabilityFormProps) {
  return (
    <section className="surface-card form-shell" id="analyzer">
      <header className="section-head">
        <p className="section-kicker">Paso 1 y 2 - Entrada del analisis</p>
        <h2>Marca la ubicacion y completa los datos del negocio</h2>
        <p>
          Selecciona direccion, rubro y ticket promedio para obtener una recomendacion basada en
          datos reales del entorno.
        </p>
      </header>

      <form onSubmit={onSubmit} className="viability-form" noValidate>
        <div className="form-section">
          <p className="form-step">Paso 1 - Ubicacion objetivo</p>
          <div className="form-map-wrap">
            <MapAddressPicker onSelect={onLocationSelect} />
          </div>
        </div>

        <div className="form-section">
          <p className="form-step">Paso 2 - Datos del negocio</p>
          <div className="form-grid">
            <label className="field field-wide" htmlFor="address-input">
              <span>Direccion</span>
              <input
                id="address-input"
                value={values.address}
                placeholder="Ej: Av. Santa Fe 2600, Buenos Aires, Argentina"
                onChange={(event) => onAddressChange(event.target.value)}
                aria-invalid={Boolean(errors.address)}
                aria-describedby={errors.address ? 'address-error' : undefined}
              />
              {errors.address ? (
                <small className="field-error" id="address-error">
                  {errors.address}
                </small>
              ) : (
                <small className="field-help">Tip: puedes arrastrar el pin para autocompletar.</small>
              )}
            </label>

            <label className="field" htmlFor="category-select">
              <span>Rubro</span>
              <select
                id="category-select"
                value={values.businessCategory}
                onChange={(event) => onBusinessCategoryChange(event.target.value as BusinessCategory)}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <small className="field-help">{selectedCategoryPitch}</small>
            </label>

            <label className="field" htmlFor="ticket-input">
              <span>Ticket promedio (opcional)</span>
              <input
                id="ticket-input"
                value={values.averageTicket}
                inputMode="decimal"
                placeholder="Ej: 12000"
                onChange={(event) => onAverageTicketChange(event.target.value)}
                aria-invalid={Boolean(errors.averageTicket)}
                aria-describedby={errors.averageTicket ? 'ticket-error' : undefined}
              />
              {errors.averageTicket ? (
                <small className="field-error" id="ticket-error">
                  {errors.averageTicket}
                </small>
              ) : (
                <small className="field-help">Si lo dejas vacio, se estima con señales del mercado.</small>
              )}
            </label>
          </div>
        </div>

        <div className="form-footer">
          <p>
            Pais detectado para analisis: <strong>{values.countryBias || 'N/A'}</strong>
          </p>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="button-loading">
                <span className="spinner" /> Analizando viabilidad...
              </span>
            ) : (
              'Analizar viabilidad'
            )}
          </button>
        </div>

        {submitError ? <p className="form-error-banner">{submitError}</p> : null}
      </form>
    </section>
  );
}
