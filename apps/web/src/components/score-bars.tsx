interface ScoreBarsProps {
  competitionScore: number;
  demandScore: number;
  differentiationScore: number;
}

interface BarItem {
  key: string;
  label: string;
  value: number;
}

function Bar({ label, value }: { label: string; value: number }) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="score-bar-item">
      <div className="score-bar-header">
        <span>{label}</span>
        <span>{normalizedValue}/100</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${normalizedValue}%` }} />
      </div>
    </div>
  );
}

export function ScoreBars({
  competitionScore,
  demandScore,
  differentiationScore,
}: ScoreBarsProps) {
  const bars: BarItem[] = [
    {
      key: 'competition',
      label: 'Competition pressure',
      value: competitionScore,
    },
    {
      key: 'demand',
      label: 'Demand signal',
      value: demandScore,
    },
    {
      key: 'differentiation',
      label: 'Differentiation potential',
      value: differentiationScore,
    },
  ];

  return (
    <div className="score-bars-grid">
      {bars.map((bar) => (
        <Bar key={bar.key} label={bar.label} value={bar.value} />
      ))}
    </div>
  );
}
