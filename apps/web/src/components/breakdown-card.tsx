import type { BreakdownItem } from '../lib/analyzer-ui';

interface BreakdownCardProps {
  items: BreakdownItem[];
}

export function BreakdownCard({ items }: BreakdownCardProps) {
  return (
    <article className="surface-card breakdown-card">
      <header>
        <p className="section-kicker">Desglose del score</p>
        <h3>Drivers del resultado</h3>
      </header>

      <div className="breakdown-list">
        {items.map((item) => (
          <div className="breakdown-item" key={item.key}>
            <div className="breakdown-head">
              <p>{item.label}</p>
              <strong>{item.value}</strong>
            </div>
            <div className="breakdown-track" aria-hidden="true">
              <span style={{ width: `${item.value}%` }} />
            </div>
            <p className="breakdown-helper">{item.helper}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
