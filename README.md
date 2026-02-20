# Vibe Store Monorepo

Backend-first monorepo for a commercial pre-feasibility analyzer.

## Goal

Given an address and business category (plus optional ticket), the backend:

1. Geocodes location.
2. Pulls nearby market/competitor data from Google APIs.
3. Builds hard metrics.
4. Computes a transparent viability score (0-100).
5. Returns verdict + map data + insights + shareable report URL.

## Repository Structure

- `apps/api`: NestJS backend (`/api/analyze`, `/api/report/:id`, `/api/health`)
- `apps/web`: Next.js frontend (UI MVP; contract migration pending)
- `packages/shared`: shared TS types used by frontend MVP

## API Modules (NestJS)

- `AnalyzeModule`: receives `POST /api/analyze` and orchestrates the end-to-end flow.
- `PlacesModule`: Google API access (`PlacesClient`) + normalization (`PlacesMapper`).
- `ScoringModule`: computes hard metrics, scores, and verdict thresholds.
- `InsightsModule`: generates insights via LLM with deterministic fallback.
- `ReportModule`: serves printable HTML report by `requestId`.
- `CacheModule`: cache storage and TTL handling for reproducible responses.
- `CommonModule`: global error format, `x-request-id`, and request logging/tracing.

## Requirements

- Node.js 20+
- npm 10+

## Setup

```bash
cp .env.example .env
npm install
```

## Run

```bash
npm run dev:api
npm run dev:web
```

- API base: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/docs`
- Web: `http://localhost:3000`

## Environment Variables

Defined in `.env.example`:

- `PORT`: backend port (default `4000`)
- `GOOGLE_MAPS_API_KEY`: required for geocoding + places
- `CACHE_TTL_SECONDS`: analyze response cache TTL
- `DETAILS_LIMIT`: max place details fetched per request
- `DETAILS_CONCURRENCY`: parallelism for details requests
- `LLM_API_KEY`: optional, enables LLM insight generation
- `LLM_ENDPOINT`: optional override for chat completions endpoint
- `LLM_MODEL`: optional model selection
- `UPSTREAM_TIMEOUT_MS`: timeout for Google APIs in ms (default `10000`)
- `LLM_TIMEOUT_MS`: timeout for LLM call in ms (default `10000`)
- `NEXT_PUBLIC_API_URL`: frontend API base (default `http://localhost:4000/api`)

## Current Backend Contract

`POST /api/analyze`

Input:

```json
{
  "address": "Av. Santa Fe, CABA",
  "businessCategory": "CAFE",
  "avgTicket": 12000,
  "countryBias": "AR"
}
```

Output includes:

- `requestId`, `location`
- `viabilityScore`, `verdict`
- `metrics` (competition/demand/differentiation)
- `hardMetrics` (transparent evidence)
- `competitorsTop` (top 10 auditable list)
- `insights`, `diagnosis`, `recommendationAngle`
- `mapData.competitorsTop`
- `report.reportUrl`
- `timingMs`, `cacheHit`

For full request/response schemas, use Swagger.

## Notes

- If `GOOGLE_MAPS_API_KEY` is missing, `/api/analyze` returns a typed error.
- If `LLM_API_KEY` is missing or LLM fails, insights are generated with deterministic fallback templates.
