import type { VerdictMeta } from '../lib/analyzer-ui';

interface ScoreCardProps {
  score: number;
  diagnosis: string;
  actionPlan: string;
  meta: VerdictMeta;
  reportUrl: string | null;
  pdfUrl: string | null;
}

export function ScoreCard({ score, diagnosis, actionPlan, meta, reportUrl, pdfUrl }: ScoreCardProps) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <article className="surface-card score-card">
      <div className="score-ring-wrap">
        <svg
          viewBox="0 0 140 140"
          className="score-ring"
          role="img"
          aria-label={`Puntaje ${normalizedScore} de 100`}
        >
          <circle className="score-ring-track" cx="70" cy="70" r={radius} />
          <circle
            className={`score-ring-progress tone-${meta.tone}`}
            cx="70"
            cy="70"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
          />
        </svg>
        <div className="score-ring-center">
          <p className="score-value">{normalizedScore}</p>
          <p className="score-denominator">/100</p>
        </div>
      </div>

      <div className="score-content">
        <p className={`status-chip tone-${meta.tone}`}>{meta.label}</p>
        <p className="score-diagnosis">{diagnosis}</p>

        <div className="action-box">
          <p className="action-title">{meta.actionTitle}</p>
          <p>{actionPlan}</p>
        </div>

        <p className="investor-copy">{meta.investorCopy}</p>

        {reportUrl || pdfUrl ? (
          <div className="score-actions">
            {reportUrl ? (
              <a href={reportUrl} target="_blank" rel="noreferrer" className="ghost-button">
                Ver reporte compartible
              </a>
            ) : null}
            {pdfUrl ? (
              <a href={pdfUrl} className="ghost-button" download>
                Descargar PDF
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
