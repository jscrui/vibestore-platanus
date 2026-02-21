import type { VerdictMeta } from '../lib/analyzer-ui';

interface VerdictBannerProps {
  meta: VerdictMeta;
  viabilityScore: number;
  address: string;
}

export function VerdictBanner({ meta, viabilityScore, address }: VerdictBannerProps) {
  return (
    <section className={`verdict-banner tone-${meta.tone}`}>
      <div className="verdict-main">
        <p className="verdict-kicker">Decision recomendada</p>
        <h2>{meta.label}</h2>
        <p>{meta.summary}</p>
      </div>
      <div className="verdict-side">
        <p className="verdict-score-label">Puntaje de viabilidad</p>
        <p className="verdict-score-value">{Math.round(viabilityScore)}</p>
        <p className="verdict-address">{address}</p>
      </div>
    </section>
  );
}
