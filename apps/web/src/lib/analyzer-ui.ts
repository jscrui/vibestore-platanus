import type { AnalyzeResponse, BusinessCategory, Verdict } from './api';

export interface CategoryOption {
  value: BusinessCategory;
  label: string;
  pitch: string;
}

export interface VerdictMeta {
  label: string;
  tone: 'open' | 'caution' | 'stop';
  summary: string;
  investorCopy: string;
  actionTitle: string;
}

export interface BreakdownItem {
  key: 'competition' | 'competitorStrength' | 'demandProxy' | 'differentiationOpportunity';
  label: string;
  value: number;
  helper: string;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'CAFE', label: 'Cafeteria', pitch: 'Frecuencia alta y ticket estable en zonas residenciales.' },
  { value: 'BAR', label: 'Bar', pitch: 'Depende fuerte de flujo nocturno y densidad de oferta cercana.' },
  {
    value: 'RESTAURANT',
    label: 'Restaurante',
    pitch: 'Demanda amplia, pero la saturacion castiga rapido una mala ubicacion.',
  },
  { value: 'KIOSK', label: 'Kiosco', pitch: 'Funciona mejor con friccion minima y alto paso peatonal.' },
  { value: 'GYM', label: 'Gimnasio', pitch: 'Retencion depende de accesibilidad y perfil demografico.' },
  { value: 'HAIR_SALON', label: 'Peluqueria', pitch: 'El fit barrial impacta directamente en recurrencia.' },
  { value: 'PHARMACY', label: 'Farmacia', pitch: 'Categoria de necesidad diaria con competencia local intensa.' },
  { value: 'PET_SHOP', label: 'Pet shop', pitch: 'Segmento sensible a ingreso y densidad de hogares con mascotas.' },
  { value: 'LAUNDRY', label: 'Lavanderia', pitch: 'Demanda practica recurrente en zonas residenciales densas.' },
  {
    value: 'ELECTRONICS_REPAIR',
    label: 'Reparacion electronica',
    pitch: 'La confianza y la visibilidad influyen en conversion.',
  },
  { value: 'BEAUTY_SALON', label: 'Salon de belleza', pitch: 'Diferenciacion y posicionamiento importan mas que volumen puro.' },
  { value: 'DENTIST', label: 'Consultorio dental', pitch: 'Servicios de alto valor requieren accesibilidad y reputacion.' },
  { value: 'SUPERMARKET', label: 'Supermercado', pitch: 'Necesita masa critica de trafico y baja presion competitiva.' },
  { value: 'CLOTHING', label: 'Tienda de ropa', pitch: 'El potencial depende de perfil de consumo y transito comercial.' },
  { value: 'BOOKSTORE', label: 'Libreria', pitch: 'Categoria de nicho que premia zonas culturales consolidadas.' },
  { value: 'CO_WORKING', label: 'Co-working', pitch: 'Ocupacion ligada a ubicacion y propuesta diferencial real.' },
];

export const VERDICT_META: Record<Verdict, VerdictMeta> = {
  OPEN: {
    label: 'Abrir',
    tone: 'open',
    summary: 'La ubicacion muestra condiciones para ejecutar ahora con riesgo controlado.',
    investorCopy: 'Caso con traccion para avanzar a due diligence comercial y cierre de local.',
    actionTitle: 'Siguiente paso recomendado',
  },
  OPEN_WITH_CONDITIONS: {
    label: 'Abrir con condiciones',
    tone: 'caution',
    summary: 'Hay oportunidad, pero requiere estrategia operativa y de precio bien definida.',
    investorCopy: 'Caso invertible solo con hipotesis claras y checkpoints de ejecucion.',
    actionTitle: 'Condiciones para activar',
  },
  DO_NOT_OPEN: {
    label: 'No abrir',
    tone: 'stop',
    summary: 'Los indicadores actuales no justifican invertir en esta ubicacion hoy.',
    investorCopy: 'Conviene preservar capital y testear microzonas alternativas.',
    actionTitle: 'Siguiente paso recomendado',
  },
};

const RECOMMENDATION_COPY: Record<string, string> = {
  specialty: 'Posicionar propuesta especializada para capturar demanda premium.',
  'take-away': 'Optimizar formato take-away para velocidad y rotacion de ticket.',
  hours: 'Ajustar horarios para cubrir ventanas desatendidas por competidores.',
  pricing: 'Usar arquitectura de precios como palanca de diferenciacion.',
  'niche-audience': 'Enfocar oferta en un nicho con comunicacion muy explicita.',
};

function toScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildScoreBreakdown(result: AnalyzeResponse): BreakdownItem[] {
  const competitorStrength = toScore(result.hardMetrics.avg_rating_same * 20);

  return [
    {
      key: 'competition',
      label: 'Competencia local',
      value: toScore(result.metrics.competitionScore),
      helper: 'Cuanto mas alto, mayor presion competitiva alrededor.',
    },
    {
      key: 'competitorStrength',
      label: 'Fuerza de competidores',
      value: competitorStrength,
      helper: 'Proxy basado en rating promedio de competidores cercanos.',
    },
    {
      key: 'demandProxy',
      label: 'Demanda potencial',
      value: toScore(result.metrics.demandScore),
      helper: 'Señal agregada de atraccion comercial en la zona.',
    },
    {
      key: 'differentiationOpportunity',
      label: 'Oportunidad de diferenciacion',
      value: toScore(result.metrics.differentiationScore),
      helper: 'Espacio para competir con propuesta de valor distinta.',
    },
  ];
}

export function buildActionPlan(result: AnalyzeResponse): string {
  const recommendation = RECOMMENDATION_COPY[result.recommendationAngle] ?? result.recommendationAngle;

  if (result.verdict === 'OPEN') {
    return `Avanza a negociacion de contrato y define plan de lanzamiento en 30 dias. Foco tactico: ${recommendation}`;
  }

  if (result.verdict === 'OPEN_WITH_CONDITIONS') {
    return `Antes de firmar, valida pricing, mix y operacion con un piloto controlado. Prioridad: ${recommendation}`;
  }

  return `Descarta esta ubicacion por ahora y reubica la busqueda en zonas con menor saturacion. Aprendizaje clave: ${recommendation}`;
}

export function formatPriceLevel(priceLevel: number | null): string {
  if (priceLevel === null || priceLevel < 1) {
    return 'N/A';
  }

  return '$'.repeat(Math.min(4, Math.max(1, priceLevel)));
}
