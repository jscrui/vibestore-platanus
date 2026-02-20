'use client';

import { useMemo, useState } from 'react';

import { ScoreBars } from '../components/score-bars';
import {
  type AnalyzeResponse,
  type BusinessCategory,
  type TicketBucket,
  type Verdict,
  buildReportUrl,
  runAnalysis,
} from '../lib/api';

interface CategoryOption {
  value: BusinessCategory;
  label: string;
  pitch: string;
}

interface FormState {
  address: string;
  businessCategory: BusinessCategory;
  countryBias: string;
  ticketBucket: TicketBucket | '';
  customTicket: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'CAFE', label: 'Cafe', pitch: 'High repeat frequency and local loyalty.' },
  { value: 'BAR', label: 'Bar', pitch: 'Night demand and ticket balance opportunities.' },
  {
    value: 'RESTAURANT',
    label: 'Restaurant',
    pitch: 'Demand can be high, but saturation risk needs precision.',
  },
  { value: 'GYM', label: 'Gym', pitch: 'Retention depends heavily on local density and profile.' },
  {
    value: 'KIOSK',
    label: 'Kiosk',
    pitch: 'Capture convenience demand with high traffic micro-locations.',
  },
  {
    value: 'HAIR_SALON',
    label: 'Hair salon',
    pitch: 'Local service frequency rewards strong neighborhood fit.',
  },
  {
    value: 'BEAUTY_SALON',
    label: 'Beauty salon',
    pitch: 'Competitive clusters can still hide underserved niches.',
  },
  {
    value: 'SUPERMARKET',
    label: 'Supermarket',
    pitch: 'Footfall potential and competitor power are critical.',
  },
  { value: 'PHARMACY', label: 'Pharmacy', pitch: 'Daily need demand with strict local pressure.' },
  {
    value: 'CO_WORKING',
    label: 'Co-working',
    pitch: 'Location fit and differentiation determine occupancy.',
  },
  { value: 'PET_SHOP', label: 'Pet shop', pitch: 'Neighborhood profile can unlock premium segments.' },
  {
    value: 'LAUNDRY',
    label: 'Laundry',
    pitch: 'Recurring practical demand depends on residential and density patterns.',
  },
  {
    value: 'ELECTRONICS_REPAIR',
    label: 'Electronics repair',
    pitch: 'Service urgency and trust signals define conversion potential.',
  },
  {
    value: 'DENTIST',
    label: 'Dentist',
    pitch: 'High-value services require low-friction accessibility and trust.',
  },
  {
    value: 'CLOTHING',
    label: 'Clothing store',
    pitch: 'Discover underexploited areas before high-rent decisions.',
  },
  {
    value: 'BOOKSTORE',
    label: 'Bookstore',
    pitch: 'Niche demand benefits from cultural and pedestrian context.',
  },
];

const TICKET_BUCKETS: Array<{ value: TicketBucket; label: string; hint: string }> = [
  {
    value: 'low',
    label: 'Low ticket',
    hint: 'Mass-market pricing strategy.',
  },
  {
    value: 'mid',
    label: 'Mid ticket',
    hint: 'Balanced price and value strategy.',
  },
  {
    value: 'high',
    label: 'High ticket',
    hint: 'Premium positioning strategy.',
  },
];

const VERDICT_COPY: Record<Verdict, { label: string; className: string; summary: string }> = {
  OPEN: {
    label: 'Open',
    className: 'verdict-open',
    summary: 'The zone supports immediate execution with strong fundamentals.',
  },
  OPEN_WITH_CONDITIONS: {
    label: 'Open with conditions',
    className: 'verdict-conditions',
    summary: 'Opportunity exists, but strategy quality will define outcomes.',
  },
  DO_NOT_OPEN: {
    label: 'Do not open',
    className: 'verdict-no-open',
    summary: 'Current indicators suggest preserving budget and reevaluating location.',
  },
};

const ANGLE_COPY: Record<string, string> = {
  specialty: 'Compete through a specialized offer.',
  'take-away': 'Lean into a fast and practical take-away proposition.',
  hours: 'Win with opening hours tailored to local gaps.',
  pricing: 'Use pricing structure as the main differentiation lever.',
  'niche-audience': 'Target a niche audience with explicit positioning.',
};

const initialState: FormState = {
  address: '',
  businessCategory: 'CAFE',
  countryBias: 'AR',
  ticketBucket: 'mid',
  customTicket: '',
};

const NAV_ITEMS = ['Method', 'Coverage', 'Scoring', 'Reports'];
const HERO_DOTS = Array.from({ length: 45 }, (_, index) => index);

function getVerdictMeta(verdict: Verdict) {
  return VERDICT_COPY[verdict];
}

function formatPriceLevel(priceLevel: number | null): string {
  if (priceLevel === null || priceLevel < 1) {
    return 'N/A';
  }

  return '$'.repeat(Math.min(4, Math.max(1, priceLevel)));
}

export default function HomePage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verdictMeta = result ? getVerdictMeta(result.verdict) : null;
  const competitorList = result?.mapData.competitorsTop ?? [];
  const reportUrl = result ? buildReportUrl(result.report.reportUrl) : null;
  const recommendation = result ? ANGLE_COPY[result.recommendationAngle] : null;
  const priceHistogram = useMemo(() => {
    if (!result) {
      return [] as Array<[string, number]>;
    }

    return Object.entries(result.hardMetrics.price_level_distribution).sort(
      (entryA, entryB) => Number(entryA[0]) - Number(entryB[0]),
    );
  }, [result]);

  const selectedCategory = CATEGORY_OPTIONS.find(
    (category) => category.value === form.businessCategory,
  );
  const selectedTicketBucket = TICKET_BUCKETS.find(
    (bucket) => bucket.value === form.ticketBucket,
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const parsedCustomTicket = form.customTicket.trim().length
        ? Number(form.customTicket)
        : undefined;

      const avgTicket =
        parsedCustomTicket !== undefined && !Number.isNaN(parsedCustomTicket)
          ? parsedCustomTicket
          : form.ticketBucket || undefined;

      const analysisResult = await runAnalysis({
        address: form.address.trim(),
        businessCategory: form.businessCategory,
        avgTicket,
        countryBias: form.countryBias.trim() || undefined,
      });

      setResult(analysisResult);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'The report could not be generated.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="on-shell">
      <div className="ambient-bg" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
        <span className="grid-noise" />
        <span className="scan-line" />
      </div>

      <header className="top-nav">
        <div className="brand-pill">VS</div>
        <nav className="nav-links" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <a key={item} href="#analyzer" className="nav-pill">
              {item}
            </a>
          ))}
        </nav>
        <a href="#analyzer" className="nav-cta">
          Start analysis
        </a>
      </header>

      <section className="hero-stage">
        <div className="hero-content">
          <p className="hero-kicker">Commercial Site Intelligence</p>
          <h1>Find profitable locations before your competitors do.</h1>
          <p className="hero-copy">
            Generate high-conviction expansion reports with a transparent score, hard metrics,
            competitor map data, and an instant shareable report URL.
          </p>
          <div className="hero-actions">
            <a href="#analyzer" className="button-main">
              Generate report now
            </a>
            <a href="#result-panel" className="button-ghost">
              See decision output
            </a>
          </div>
          <div className="hero-tags">
            <span>Geo + Places Intelligence</span>
            <span>Signal-based scoring engine</span>
            <span>Instant board-ready report</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="dot-matrix">
            {HERO_DOTS.map((dot) => (
              <span key={dot} className="dot-cell" />
            ))}
          </div>
          <p className="hero-number">
            97<span>.4</span>
          </p>
          <p className="hero-visual-label">signal confidence</p>
          <div className="pulse-rings">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="analyzer-panel" id="analyzer">
        <div className="panel-head">
          <p className="panel-kicker">Live Analyzer</p>
          <h2>Run a pre-feasibility scan in seconds</h2>
        </div>

        <div className="panel-grid">
          <form onSubmit={onSubmit} className="analysis-form">
            <label>
              Store address
              <input
                required
                placeholder="Av. Corrientes 1234, CABA"
                value={form.address}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, address: event.target.value }))
                }
              />
            </label>

            <label>
              Business category
              <select
                value={form.businessCategory}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    businessCategory: event.target.value as BusinessCategory,
                  }))
                }
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Country bias
              <input
                placeholder="AR"
                maxLength={2}
                value={form.countryBias}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    countryBias: event.target.value.toUpperCase(),
                  }))
                }
              />
            </label>

            <label>
              Pricing profile
              <select
                value={form.ticketBucket}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    ticketBucket: event.target.value as TicketBucket,
                  }))
                }
              >
                {TICKET_BUCKETS.map((bucket) => (
                  <option key={bucket.value} value={bucket.value}>
                    {bucket.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Optional exact average ticket
              <input
                inputMode="decimal"
                placeholder="12000"
                value={form.customTicket}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, customTicket: event.target.value }))
                }
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? 'Calculating...' : 'Analyze location'}
            </button>
          </form>

          <aside className="panel-aside">
            <h3>Why teams use this before signing leases</h3>
            <ul>
              <li>Removes emotional bias from expansion decisions.</li>
              <li>Surfaces saturation and demand signals in one view.</li>
              <li>Adds execution guidance with recommendation angle.</li>
              <li>Produces a report you can share in the same meeting.</li>
            </ul>
            <p>
              <strong>Category angle:</strong> {selectedCategory?.pitch}
            </p>
            <p>
              <strong>Ticket profile:</strong> {selectedTicketBucket?.hint}
            </p>
          </aside>
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      {result ? (
        <section className="result-zone" id="result-panel">
          <article className="result-card score-card">
            <p className="result-eyebrow">Viability score</p>
            <p className="score-value">{result.viabilityScore}</p>
            {verdictMeta ? (
              <p className={`verdict-pill ${verdictMeta.className}`}>{verdictMeta.label}</p>
            ) : null}
            <p className="verdict-text">{result.diagnosis}</p>
            {verdictMeta ? <p className="verdict-summary">{verdictMeta.summary}</p> : null}
            {reportUrl ? (
              <a className="button-main" href={reportUrl} target="_blank" rel="noreferrer">
                Open printable report
              </a>
            ) : null}
          </article>

          <article className="result-card">
            <h3>Score components</h3>
            <ScoreBars
              competitionScore={result.metrics.competitionScore}
              demandScore={result.metrics.demandScore}
              differentiationScore={result.metrics.differentiationScore}
            />
          </article>

          <article className="result-card">
            <h3>Hard evidence</h3>
            <ul className="metric-list">
              <li>{result.hardMetrics.count_same_800m} same-category businesses within 800m</li>
              <li>{result.hardMetrics.count_same_1500m} same-category businesses within 1500m</li>
              <li>{result.hardMetrics.density_all_800m} total businesses inside 800m radius</li>
              <li>{result.hardMetrics.median_reviews_same} median same-category reviews</li>
              <li>{result.hardMetrics.avg_rating_same.toFixed(1)} average same-category rating</li>
            </ul>
            {result.hardMetrics.detected_price_gap.isGap ? (
              <p className="gap-highlight">
                Price gap detected. Suggested tier: {result.hardMetrics.detected_price_gap.suggested}
              </p>
            ) : (
              <p className="gap-highlight">No clear price gap detected in this area.</p>
            )}
          </article>

          <article className="result-card">
            <h3>Pricing pressure</h3>
            <div className="price-chips">
              {priceHistogram.map(([priceLevel, count]) => (
                <span key={priceLevel} className="price-chip">
                  Level {priceLevel}: {count}
                </span>
              ))}
            </div>
            <p className="muted">
              Recommendation angle: <strong>{recommendation ?? result.recommendationAngle}</strong>
            </p>
            <p className="muted">
              Market center: {result.mapData.center.lat.toFixed(4)}, {result.mapData.center.lng.toFixed(4)}
            </p>
          </article>

          <article className="result-card competitors-card">
            <h3>Closest competitors</h3>
            <div className="competitor-table">
              <div className="competitor-row competitor-head">
                <span>Name</span>
                <span>Rating</span>
                <span>Reviews</span>
                <span>Price</span>
                <span>Distance</span>
              </div>
              {competitorList.map((competitor) => (
                <div className="competitor-row" key={competitor.place_id}>
                  <span>{competitor.name}</span>
                  <span>{competitor.rating ?? 'N/A'}</span>
                  <span>{competitor.user_ratings_total}</span>
                  <span>{formatPriceLevel(competitor.price_level)}</span>
                  <span>{competitor.distance_m}m</span>
                </div>
              ))}
            </div>
          </article>

          <article className="result-card insights-card">
            <h3>Actionable insights</h3>
            <ul className="insights-list">
              {result.insights.map((insight, index) => (
                <li key={`${insight}-${index}`}>{insight}</li>
              ))}
            </ul>
            <p className="timing-note">
              Generated {new Date(result.generatedAt).toLocaleString()} in {result.timingMs.total}ms{' '}
              {result.cacheHit ? '(cache hit)' : ''}
            </p>
          </article>
        </section>
      ) : null}
    </main>
  );
}
