'use client';

import { type FormEvent, type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import './landing.css';

import {
  type ViabilityFormErrors,
  type ViabilityFormValues,
  ViabilityForm,
} from '../components/viability-form';
import type { MapLocationSelection } from '../components/map-address-picker';
import { type AnalyzeResponse, buildReportUrl, runAnalysis } from '../lib/api';
import {
  buildActionPlan,
  CATEGORY_OPTIONS,
  formatPriceLevel,
  VERDICT_META,
} from '../lib/analyzer-ui';

const INITIAL_FORM_VALUES: ViabilityFormValues = {
  address: 'Av. Coronel Diaz 2689',
  businessCategory: 'CAFE',
  averageTicket: '',
  countryBias: 'AR',
};

function parseAverageTicket(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const asNumber = Number(normalized.replace(',', '.'));
  return Number.isFinite(asNumber) ? asNumber : undefined;
}

function validateForm(values: ViabilityFormValues): ViabilityFormErrors {
  const errors: ViabilityFormErrors = {};

  if (!values.address.trim()) {
    errors.address = 'Ingresa una direccion valida o selecciona una ubicacion en el mapa.';
  }

  const parsedAverageTicket = parseAverageTicket(values.averageTicket);
  if (values.averageTicket.trim() && (!parsedAverageTicket || parsedAverageTicket <= 0)) {
    errors.averageTicket = 'El ticket promedio debe ser un numero mayor a 0.';
  }

  return errors;
}

const FEATURED_LOCALS = [
  {
    id: 1,
    name: 'Local Palermo · 120m²',
    address: 'Thames 1820, Palermo',
    image: '/local-boutique.png',
    idealFor: 'Boutique / Showroom',
    tags: ['Alta rotación peatonal', 'Zona premium', 'Frente amplio'],
    viabilityScore: 91,
    verdict: 'great',
    pitch: 'El mejor barrio de moda de Buenos Aires. Ideal para una tienda de diseño o showroom de autor.',
  },
  {
    id: 2,
    name: 'Local Recoleta · 80m²',
    address: 'Av. Santa Fe 2450, Recoleta',
    image: '/local-cafe.png',
    idealFor: 'Café / Specialty Coffee',
    tags: ['Alto poder adquisitivo', 'Demanda insatisfecha', 'Turismo activo'],
    viabilityScore: 87,
    verdict: 'great',
    pitch: 'Zona residencial consolidad con escasa oferta de café de especialidad. Oportunidad única.',
  },
  {
    id: 3,
    name: 'Local San Telmo · 200m²',
    address: 'Defensa 890, San Telmo',
    image: '/local-restaurant.png',
    idealFor: 'Restaurante / Gastrobar',
    tags: ['Turismo masivo', 'Mercado nocturno', 'Local histórico'],
    viabilityScore: 83,
    verdict: 'good',
    pitch: 'San Telmo recibe miles de turistas por semana. El espacio tiene potencial gastronómico único.',
  },
  {
    id: 4,
    name: 'Local Caballito · 150m²',
    address: 'Av. Rivadavia 5500, Caballito',
    image: '/local-gym.png',
    idealFor: 'Fitness / Centro de entrenamiento',
    tags: ['Barrio residencial denso', 'Sin competencia directa', 'Alta demanda'],
    viabilityScore: 88,
    verdict: 'great',
    pitch: 'Barrio con alta densidad poblacional y escasa oferta fitness premium en el radio de 800m.',
  },
  {
    id: 5,
    name: 'Local Belgrano · 90m²',
    address: 'Cabildo 2180, Belgrano',
    image: '/local-salon.png',
    idealFor: 'Estética / Spa / Centro de belleza',
    tags: ['NSE alto', 'Clientela femenina consolidada', 'Tráfico constante'],
    viabilityScore: 85,
    verdict: 'good',
    pitch: 'Belgrano concentra NSE alto con gran demanda de servicios de bienestar y belleza premium.',
  },
  {
    id: 6,
    name: 'Local Villa Crespo · 175m²',
    address: 'Av. Corrientes 5900, V. Crespo',
    image: '/local-coworking.png',
    idealFor: 'Coworking / Oficinas flexibles',
    tags: ['Polo tecnológico', 'Startup ecosystem', 'Demanda creciente'],
    viabilityScore: 89,
    verdict: 'great',
    pitch: 'Villa Crespo se consolida como el nuevo polo tech de CABA. La demanda de coworking explota.',
  },
  {
    id: 7,
    name: 'Local Flores · 60m²',
    address: 'Av. Rivadavia 7020, Flores',
    image: '/local-farmacia.png',
    idealFor: 'Farmacia / Dietética / Salud',
    tags: ['Alta densidad', 'Tráfico peatonal masivo', 'Necesidad básica'],
    viabilityScore: 82,
    verdict: 'good',
    pitch: 'Av. Rivadavia en Flores es una de las arterias comerciales más transitadas de la ciudad.',
  },
  {
    id: 8,
    name: 'Local Núñez · 100m²',
    address: 'Av. Cabildo 3800, Núñez',
    image: '/local-panaderia.png',
    idealFor: 'Panadería artesanal / Confitería',
    tags: ['Barrio familiar', 'Sin competencia artesanal', 'Alta fidelización'],
    viabilityScore: 86,
    verdict: 'great',
    pitch: 'Núñez tiene alta densidad de familias con ingreso medio-alto. El nicho artesanal está vacante.',
  },
  {
    id: 9,
    name: 'Local Microcentro · 300m²',
    address: 'Florida 720, Microcentro',
    image: '/local-comercial.png',
    idealFor: 'Comercio / Servicios corporativos',
    tags: ['500K peatones/día', 'Máxima visibilidad', 'Local esquina'],
    viabilityScore: 78,
    verdict: 'caution',
    pitch: 'Florida Street tiene el tráfico peatonal más alto de CABA. Alta competencia pero altísima exposición.',
  },
];

const VERDICT_SCORE_COLOR: Record<string, string> = {
  great: '#10b981',
  good: '#3b82f6',
  caution: '#f59e0b',
  bad: '#ef4444',
};

const LOADING_STEPS = [
  "Analizando ubicación en mapas...",
  "Extrayendo competidores cercanos...",
  "Calculando densidad y demanda del mercado...",
  "Evaluando presión competitiva...",
  "Procesando recomendaciones de IA...",
  "Generando reporte final y gráficos..."
];

// Payment flow steps
const PAYMENT_STEPS = [
  { id: 'card', label: 'Ingresa tu tarjeta', icon: '💳', detail: 'Encriptado con SSL' },
  { id: 'processing', label: 'Procesando pago...', icon: '⚙️', detail: 'Conectando con el banco' },
  { id: 'confirmed', label: '¡Pago confirmado!', icon: '✅', detail: 'Acceso desbloqueado' },
];

export default function HomePage() {
  const [formValues, setFormValues] = useState<ViabilityFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<ViabilityFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paymentStep, setPaymentStep] = useState<0 | 1 | 2 | 3>(0);
  const [scrollUnlocked, setScrollUnlocked] = useState(false);
  const [llmDiagnosis, setLlmDiagnosis] = useState<string | null>(null);
  const [llmDiagnosisLoading, setLlmDiagnosisLoading] = useState(false);
  const [showSvLightbox, setShowSvLightbox] = useState(false);

  const selectedCategory = useMemo(
    () => CATEGORY_OPTIONS.find((category) => category.value === formValues.businessCategory),
    [formValues.businessCategory],
  );

  const reportUrl = result ? buildReportUrl(result.report.reportUrl) : null;
  const pdfUrl = result
    ? buildReportUrl(result.report.pdfUrl ?? `${result.report.reportUrl}.pdf`)
    : null;
  const actionPlan = useMemo(() => (result ? buildActionPlan(result) : ''), [result]);

  // Lock scroll when paywall is shown and results appeared but not yet paid
  useEffect(() => {
    if (showPaywall || (result && !scrollUnlocked)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showPaywall, result, scrollUnlocked]);

  useEffect(() => {
    if (!isSubmitting) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 1800); // 1.8s per step — deliberate pacing for premium feel
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const onLocationSelect = useCallback((location: MapLocationSelection) => {
    setFormValues((previous) => ({
      ...previous,
      // Only replace address from map if user hasn't typed anything yet
      address: previous.address.trim() ? previous.address : (location.address || previous.address),
      countryBias: location.countryCode ?? previous.countryBias,
    }));

    setFormErrors((previous) => ({ ...previous, address: undefined }));
  }, []);

  const onAddressChange = useCallback((address: string) => {
    setFormValues((previous) => ({ ...previous, address }));
    setFormErrors((previous) => ({ ...previous, address: undefined }));
  }, []);

  const onBusinessCategoryChange = useCallback((businessCategory: ViabilityFormValues['businessCategory']) => {
    setFormValues((previous) => ({ ...previous, businessCategory }));
  }, []);

  const onAverageTicketChange = useCallback((averageTicket: string) => {
    setFormValues((previous) => ({ ...previous, averageTicket }));
    setFormErrors((previous) => ({ ...previous, averageTicket: undefined }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSvLightbox(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const validationErrors = validateForm(formValues);
      setFormErrors(validationErrors);
      setSubmitError(null);

      if (Object.values(validationErrors).some(Boolean)) {
        return;
      }

      setIsSubmitting(true);
      try {
        const parsedAverageTicket = parseAverageTicket(formValues.averageTicket);

        const analysisResult = await runAnalysis({
          address: formValues.address.trim(),
          businessCategory: formValues.businessCategory,
          avgTicket: parsedAverageTicket,
          countryBias: formValues.countryBias,
        });

        setResult(analysisResult);
        setShowPaywall(true);
        setScrollUnlocked(false);
        setPaymentStep(0);
        setLlmDiagnosis(null);
        setLlmDiagnosisLoading(true);

        // Fetch LLM visual diagnosis in background (doesn't block the paywall)
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
        fetch(`${apiBase}/diagnosis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: analysisResult.mapData?.center?.lat,
            lng: analysisResult.mapData?.center?.lng,
            address: analysisResult.location.formattedAddress,
            businessCategory: formValues.businessCategory,
            viabilityScore: analysisResult.viabilityScore,
            verdict: analysisResult.verdict,
            hardMetrics: analysisResult.hardMetrics,
            avgTicket: parsedAverageTicket,
          }),
        })
          .then((r) => r.json())
          .then((data: { diagnosis?: string }) => {
            if (data.diagnosis) setLlmDiagnosis(data.diagnosis);
          })
          .catch(() => { /* silently ignore */ })
          .finally(() => setLlmDiagnosisLoading(false));
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'No pudimos completar el analisis. Intenta nuevamente.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [formValues],
  );

  const handleStartAnalysis = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsFormVisible(true);
    setTimeout(() => {
      document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const modalMeta = result ? VERDICT_META[result.verdict] : null;

  const handlePaymentStart = useCallback(() => {
    setPaymentStep(1);
    setTimeout(() => {
      setPaymentStep(2);
      setTimeout(() => {
        setPaymentStep(3);
        setTimeout(() => {
          setShowPaywall(false);
          setScrollUnlocked(true);
          setTimeout(() => {
            document.getElementById('inline-results-top')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }, 1200);
      }, 1800);
    }, 1500);
  }, []);

  return (
    <>
      {/* ── Persistent Navbar ── */}
      <nav className="vibe-nav vibe-nav--sticky">
        <div className="vibe-logo">
          <span className="vibe-logo-dot" />
          vibe.store
        </div>
        <a href="#analyzer" onClick={handleStartAnalysis} className="vibe-nav-btn">
          Analizar Ubicación
        </a>
      </nav>

      {!isFormVisible ? (
        <main className="vibe-landing">

          <section className="vibe-hero">
            <span className="vibe-badge">Inteligencia de ubicación</span>
            <h1 className="vibe-title">Abre el negocio correcto en el lugar correcto.</h1>
            <p className="vibe-subtitle">Descubre el potencial comercial de cualquier punto en la ciudad con inteligencia artificial y datos hiperlocales.</p>
            <a href="#analyzer" onClick={handleStartAnalysis} className="vibe-cta">
              Empezar análisis gratis
            </a>
          </section>

          {/* ── Featured Locals 3×3 Grid ── */}
          <section className="featured-section">
            <div className="featured-header">
              <span className="vibe-badge" style={{ marginBottom: 0 }}>Locales analizados y publicados</span>
              <h2 className="featured-title">Los mejores locales de Buenos Aires, según la IA</h2>
              <p className="featured-subtitle">
                Analizamos cada espacio, te decimos para qué es más idóneo y lo publicamos para que encuentres tu próximo negocio.
              </p>
            </div>

            <div className="featured-grid">
              {FEATURED_LOCALS.map((local) => (
                <article key={local.id} className="featured-card">
                  {/* Image */}
                  <div className="featured-card-img-wrap">
                    <img
                      src={local.image}
                      alt={local.name}
                      className="featured-card-img"
                    />
                    <div className="featured-card-img-gradient" />
                    {/* Viability score badge */}
                    <div
                      className="featured-card-score"
                      style={{ color: VERDICT_SCORE_COLOR[local.verdict] }}
                    >
                      <span className="featured-card-score-num">{local.viabilityScore}</span>
                      <span className="featured-card-score-label">vibe</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="featured-card-body">
                    <div className="featured-card-ideal">
                      <span className="featured-card-ideal-icon">✦</span>
                      {local.idealFor}
                    </div>
                    <h3 className="featured-card-name">{local.name}</h3>
                    <p className="featured-card-address">📍 {local.address}</p>
                    <p className="featured-card-pitch">{local.pitch}</p>

                    {/* Tags */}
                    <div className="featured-card-tags">
                      {local.tags.map((tag) => (
                        <span key={tag} className="featured-card-tag">{tag}</span>
                      ))}
                    </div>

                    <button
                      className="featured-card-cta"
                      onClick={handleStartAnalysis}
                    >
                      Ver análisis completo →
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="featured-bottom-cta">
              <p className="featured-bottom-text">
                ¿Tenés un local? <strong>Lo analizamos gratis</strong> y te decimos para qué negocio es ideal.
              </p>
              <a href="#analyzer" onClick={handleStartAnalysis} className="vibe-cta" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
                Analizar mi local →
              </a>
            </div>
          </section>
        </main>
      ) : (
        <main className="app-shell landing-shell">
          <section id="analyzer" className="form-stage animate-fade-in-up delay-100">
            {!result && !isSubmitting && (
              <ViabilityForm
                values={formValues}
                errors={formErrors}
                categories={CATEGORY_OPTIONS}
                isSubmitting={isSubmitting}
                submitError={submitError}
                selectedCategoryPitch={selectedCategory?.pitch}
                onAddressChange={onAddressChange}
                onBusinessCategoryChange={onBusinessCategoryChange}
                onAverageTicketChange={onAverageTicketChange}
                onLocationSelect={onLocationSelect}
                onSubmit={onSubmit}
              />
            )}

            {isSubmitting ? (
              <div className="vibe-loading-container animate-fade-in-up">
                {/* Animated radar/pulse orb */}
                <div className="vibe-loading-orb">
                  <div className="vibe-loading-orb-ring" />
                  <div className="vibe-loading-orb-ring vibe-loading-orb-ring--2" />
                  <div className="vibe-loading-orb-core" />
                </div>

                {/* Current step label */}
                <h2 className="vibe-loading-title" key={loadingStep}>
                  {LOADING_STEPS[loadingStep]}
                </h2>

                {/* Progress bar */}
                <div className="vibe-loading-bar-track">
                  <div
                    className="vibe-loading-bar-fill"
                    style={{ width: `${Math.round(((loadingStep + 1) / LOADING_STEPS.length) * 100)}%` }}
                  />
                </div>

                {/* Step dots */}
                <div className="vibe-loading-steps">
                  {LOADING_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={`vibe-loading-step ${i < loadingStep ? 'done' : i === loadingStep ? 'active' : ''}`}
                      title={step}
                    >
                      {i < loadingStep ? '✓' : i + 1}
                    </div>
                  ))}
                </div>

                <p className="vibe-loading-subtitle">
                  Analizando datos reales de Google Maps e interpretando con IA. Esto puede tomar unos segundos.
                </p>
              </div>

            ) : result ? (
              <div id="inline-results-top" className="inline-results-container animate-fade-in-up delay-200">

                {/* ── Header ── */}
                <header className="results-header">
                  {result.mapData?.center && (
                    <div
                      className="results-streetview-wrap"
                      role="button"
                      tabIndex={0}
                      aria-label="Ampliar imagen Street View"
                      onClick={() => setShowSvLightbox(true)}
                      onKeyDown={(e) => e.key === 'Enter' && setShowSvLightbox(true)}
                    >
                      <img
                        className="results-streetview-img"
                        src={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/streetview?lat=${result.mapData.center.lat}&lng=${result.mapData.center.lng}&width=1200&height=420&fov=85`}
                        alt={`Street View de ${result.location.formattedAddress}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                        }}
                      />
                      <div className="results-streetview-gradient" />
                      <div className="results-streetview-hint">🔍 Ampliar</div>
                    </div>
                  )}
                  <div className="results-header-inner">
                    <span className="section-kicker">Resultados del Análisis</span>
                    <h2 className="results-address">{result.location.formattedAddress}</h2>
                    <p className="results-request-id">ID: {result.requestId}</p>
                  </div>
                </header>


                <div className="insights-inline-body">

                  {/* ── Score + Diagnosis ── */}
                  <section className="insights-summary">
                    <div className={`action-box tone-${modalMeta?.tone ?? 'caution'}`}>
                      <p className={`status-chip tone-${modalMeta?.tone ?? 'caution'}`} style={{ marginBottom: '0.5rem' }}>
                        {modalMeta?.label ?? 'Resultado'}
                      </p>
                      <p>{actionPlan}</p>
                    </div>
                    <p className="score-diagnosis">
                      {llmDiagnosisLoading ? (
                        <span style={{ color: '#4a6580', fontStyle: 'italic' }}>Generando diagnóstico con IA...</span>
                      ) : llmDiagnosis ? (
                        llmDiagnosis
                      ) : (
                        result.diagnosis
                      )}
                    </p>
                  </section>



                  {/* ── Donut Charts ── */}
                  <section className="results-section">
                    <h3 className="results-section-title">Métricas clave</h3>
                    <div className="insights-charts-block">

                      {/* Viability Donut */}
                      <article className="surface-card donut-card">
                        <h4 className="donut-label" style={{ color: '#3b82f6' }}>Viabilidad General</h4>
                        <p className="donut-sublabel">Score global del sector</p>
                        <div className="donut-wrapper">
                          <div className="donut-center-label">
                            <span style={{ textShadow: '0 0 16px rgba(59, 130, 246, 0.5)' }}>
                              {Math.round(result.viabilityScore || 0)}
                            </span>
                          </div>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Score', value: Math.round(result.viabilityScore || 0) },
                                  { name: 'Restante', value: 100 - Math.round(result.viabilityScore || 0) }
                                ]}
                                cx="50%" cy="50%" innerRadius={70} outerRadius={85} startAngle={90} endAngle={-270}
                                dataKey="value" stroke="none" cornerRadius={8}
                              >
                                <Cell fill="#3b82f6" style={{ filter: 'drop-shadow(0px 0px 12px rgba(59, 130, 246, 0.8))' }} />
                                <Cell fill="rgba(255, 255, 255, 0.05)" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </article>

                      {/* Market Activity Donut */}
                      <article className="surface-card donut-card">
                        <h4 className="donut-label" style={{ color: '#10b981' }}>Actividad de Mercado</h4>
                        <p className="donut-sublabel">Densidad del área vs máxima analizada</p>
                        <div className="donut-wrapper">
                          <div className="donut-center-label">
                            <span style={{ textShadow: '0 0 16px rgba(16, 185, 129, 0.5)' }}>
                              {Math.min(100, Math.round(((result.hardMetrics?.density_all_800m || 0) / 500) * 100))}
                            </span>
                          </div>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Actividad', value: Math.min(100, Math.round(((result.hardMetrics?.density_all_800m || 0) / 500) * 100)) },
                                  { name: 'Restante', value: 100 - Math.min(100, Math.round(((result.hardMetrics?.density_all_800m || 0) / 500) * 100)) }
                                ]}
                                cx="50%" cy="50%" innerRadius={70} outerRadius={85} startAngle={90} endAngle={-270}
                                dataKey="value" stroke="none" cornerRadius={8}
                              >
                                <Cell fill="#10b981" style={{ filter: 'drop-shadow(0px 0px 12px rgba(16, 185, 129, 0.8))' }} />
                                <Cell fill="rgba(255, 255, 255, 0.05)" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </article>

                      {/* Competitors Donut */}
                      <article className="surface-card donut-card">
                        <h4 className="donut-label" style={{ color: '#f59e0b' }}>Presión Competitiva</h4>
                        <p className="donut-sublabel">Nivel de competencia en la zona</p>
                        <div className="donut-wrapper">
                          <div className="donut-center-label">
                            <span style={{ textShadow: '0 0 16px rgba(245, 158, 11, 0.5)' }}>
                              {Math.min(100, Math.round(((result.hardMetrics?.count_same_800m || 0) / 20) * 100))}
                            </span>
                          </div>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Presión', value: Math.min(100, Math.round(((result.hardMetrics?.count_same_800m || 0) / 20) * 100)) },
                                  { name: 'Restante', value: 100 - Math.min(100, Math.round(((result.hardMetrics?.count_same_800m || 0) / 20) * 100)) }
                                ]}
                                cx="50%" cy="50%" innerRadius={70} outerRadius={85} startAngle={90} endAngle={-270}
                                dataKey="value" stroke="none" cornerRadius={8}
                              >
                                <Cell fill="#f59e0b" style={{ filter: 'drop-shadow(0px 0px 12px rgba(245, 158, 11, 0.8))' }} />
                                <Cell fill="rgba(255, 255, 255, 0.05)" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </article>

                    </div>
                  </section>

                  {/* ── Metric Cards ── */}
                  <section className="results-section">
                    <h3 className="results-section-title">Datos del área</h3>
                    <section className="insights-metrics-grid">
                      <article className="surface-card insights-metric-card">
                        <h3>Competencia inmediata</h3>
                        <p className="metric-value">{result.hardMetrics?.count_same_800m || 0}</p>
                        <p>negocios de la misma categoría en 800m</p>
                      </article>
                      <article className="surface-card insights-metric-card">
                        <h3>Actividad del mercado</h3>
                        <p className="metric-value">{result.hardMetrics?.density_all_800m || 0}</p>
                        <p>negocios totales en 800m</p>
                      </article>
                      <article className="surface-card insights-metric-card">
                        <h3>Rating competitivo</h3>
                        <p className="metric-value">{(result.hardMetrics?.avg_rating_same || 0).toFixed(1)}</p>
                        <p>promedio de competidores directos</p>
                      </article>
                      <article className="surface-card insights-metric-card">
                        <h3>Centro analizado</h3>
                        <p className="metric-value">
                          {result.mapData?.center?.lat?.toFixed(3) || 0}, {result.mapData?.center?.lng?.toFixed(3) || 0}
                        </p>
                        <p>coordenadas del punto de referencia</p>
                      </article>
                    </section>
                  </section>

                  {/* ── Recommendations ── */}
                  <section className="results-section">
                    <h3 className="results-section-title">Recomendaciones accionables</h3>
                    <ul className="insight-list">
                      {(result.insights || []).map((insight, index) => (
                        <li key={`${insight}-${index}`}>{insight}</li>
                      ))}
                    </ul>
                  </section>

                  {/* ── Competitors Table — sorted by distance ── */}
                  <section className="results-section">
                    <h3 className="results-section-title">Competidores detectados <span className="results-section-badge">por cercanía</span></h3>
                    <div className="insights-table-block">
                      <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th className="table-th">#</th>
                            <th className="table-th">Nombre</th>
                            <th className="table-th">Rating</th>
                            <th className="table-th">Reseñas</th>
                            <th className="table-th">Precio</th>
                            <th className="table-th">Distancia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...((result as any).mapData?.competitorsTop || (result as any).competitorsTop || [])]
                            .sort((a: any, b: any) => (a.distance_m || 0) - (b.distance_m || 0))
                            .map((comp: any, i: number) => (
                              <tr key={comp.place_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td className="table-td" style={{ color: '#4a6580', fontWeight: 700, fontSize: '0.85rem', width: '2.5rem' }}>{i + 1}</td>
                                <td className="table-td" style={{ fontWeight: 600, color: '#e2e8f0' }}>
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(comp.name)}&query_place_id=${comp.place_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                    title="Ver en Google Maps"
                                  >
                                    {comp.name}
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                  </a>
                                </td>
                                <td className="table-td" style={{ color: '#f59e0b', fontWeight: 600 }}>{comp.rating ? `★ ${comp.rating}` : '-'}</td>
                                <td className="table-td" style={{ color: '#b0cbe8' }}>{comp.user_ratings_total ?? '-'}</td>
                                <td className="table-td" style={{ color: '#10b981', fontSize: '0.9rem' }}>{comp.price_level ? '💰'.repeat(comp.price_level) : '-'}</td>
                                <td className="table-td" style={{ color: '#3b82f6', fontWeight: 700 }}>{Math.round(comp.distance_m || 0)}m</td>
                              </tr>
                            ))}
                          {((result as any).mapData?.competitorsTop || (result as any).competitorsTop || []).length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#9eb6d3' }}>
                                No se encontraron competidores directos cercanos.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* ── Footer actions ── */}
                  <footer className="insights-actions">
                    {reportUrl ? (
                      <a href={reportUrl} target="_blank" rel="noreferrer" className="ghost-button">
                        Abrir reporte HTML
                      </a>
                    ) : null}
                    {pdfUrl ? (
                      <a href={pdfUrl} className="primary-button" download>
                        Descargar PDF
                      </a>
                    ) : null}
                  </footer>

                </div>
              </div>
            ) : null}
          </section>
        </main>
      )}

      {/* Street View Lightbox */}
      {showSvLightbox && result?.mapData?.center && (
        <div
          className="sv-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Street View ampliado"
          onClick={() => setShowSvLightbox(false)}
        >
          <div className="sv-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button
              className="sv-lightbox-close"
              aria-label="Cerrar"
              onClick={() => setShowSvLightbox(false)}
            >
              ✕
            </button>
            <img
              className="sv-lightbox-img"
              src={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/streetview?lat=${result.mapData.center.lat}&lng=${result.mapData.center.lng}&width=1600&height=900&fov=75`}
              alt={`Street View de ${result.location.formattedAddress}`}
            />
            <p className="sv-lightbox-caption">{result.location.formattedAddress}</p>
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="paywall-overlay" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
          <div className="paywall-card">
            <div className="paywall-badge">🔒 Acceso Premium</div>
            <h2 id="paywall-title" className="paywall-title">
              Tu informe está listo
            </h2>
            <p className="paywall-subtitle">
              Desbloquea el análisis completo de viabilidad, competidores y recomendaciones accionables.
            </p>

            <div className="paywall-price-block">
              <span className="paywall-price">$1</span>
              <span className="paywall-price-label">USD · pago único · demo</span>
            </div>

            {paymentStep === 0 && (
              <>
                <ul className="paywall-features">
                  <li>✔ Score de viabilidad detallado</li>
                  <li>✔ Análisis de competidores cercanos</li>
                  <li>✔ Recomendaciones de IA accionables</li>
                  <li>✔ Métricas de mercado hiperlocales</li>
                </ul>
                <button className="paywall-pay-btn" onClick={handlePaymentStart}>
                  Pagar $1 y desbloquear informe
                </button>
                <p className="paywall-secure">🔐 Pago seguro · SSL encriptado · Demo mode</p>
              </>
            )}

            {paymentStep > 0 && (
              <div className="paywall-steps">
                {PAYMENT_STEPS.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isDone = paymentStep > stepNum;
                  const isActive = paymentStep === stepNum;
                  return (
                    <div key={step.id} className={`paywall-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                      <span className="paywall-step-icon">
                        {isDone ? '✅' : isActive ? step.icon : '⏳'}
                      </span>
                      <div>
                        <p className="paywall-step-label">{step.label}</p>
                        <p className="paywall-step-detail">{step.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
