# API (NestJS)

Backend for Vibe Store viability analysis.

## Responsibilities

- Validate analyze request input.
- Resolve geolocation from address/placeId.
- Query Google Places (nearby + details).
- Build hard metrics.
- Compute viability score and verdict.
- Generate insights via LLM or deterministic fallback.
- Cache responses and expose report HTML.
- Return reproducible, cacheable, and auditable outputs.

## Modules

- `AnalyzeModule`: `AnalyzeController` (`POST /api/analyze`) + `AnalysisService` orchestration
- `PlacesModule`: `PlacesClient` (Google HTTP) + `PlacesMapper` + `PlacesService`
- `ScoringModule`: `FeaturesBuilder`, `ScoreEngine`, `VerdictEngine` (+ `ScoringService` facade)
- `InsightsModule`: `LlmInsightsService` + `InsightsFallbackService` (+ `InsightsService` orchestrator)
- `ReportModule`: `ReportController` (`GET /api/report/:requestId`) + `ReportService`
- `CacheModule`: `CacheStore` + `AnalysisCacheService`
- `CommonModule`: global error filter + request context/logging interceptor

## Endpoints

Base prefix: `/api`

- `POST /api/analyze`
- `GET /api/report/:requestId`
- `GET /api/health`

Swagger:

- UI: `http://localhost:4000/docs`
- JSON: `http://localhost:4000/docs-json`

## Analyze Request

```json
{
  "address": "Av. Cabildo 2200, CABA",
  "businessCategory": "CAFE",
  "avgTicket": "mid",
  "countryBias": "AR",
  "placeId": "optional"
}
```

## Analyze Response (high-level)

- `requestId`
- `input`, `location`
- `viabilityScore`, `verdict`
- `metrics` (3 bars)
- `hardMetrics` (transparent scoring evidence)
- `competitorsTop` (top 10 at root, auditable)
- `insights` (5)
- `diagnosis`
- `recommendationAngle`
- `mapData.competitorsTop` (top 10)
- `report.reportUrl`
- `timingMs`
- `generatedAt`, `cacheHit`

## Scoring Model

Implemented formula (transparent heuristics):

- `saturation_penalty`
- `competitor_strength_penalty`
- `demand_bonus`
- `differentiation_bonus`
- `finalScore = clamp(100 - penalties + bonuses, 0, 100)`

Verdict mapping:

- `0-39` -> `DO_NOT_OPEN`
- `40-69` -> `OPEN_WITH_CONDITIONS`
- `70-100` -> `OPEN`

## Environment

Required:

- `GOOGLE_MAPS_API_KEY`

Optional:

- `CACHE_TTL_SECONDS` (default `86400`)
- `DETAILS_LIMIT` (default `20`)
- `DETAILS_CONCURRENCY` (default `5`)
- `LLM_API_KEY`
- `LLM_ENDPOINT` (default OpenAI Chat Completions)
- `LLM_MODEL` (default `gpt-4.1-mini`)
- `UPSTREAM_TIMEOUT_MS` (default `10000`)
- `LLM_TIMEOUT_MS` (default `10000`)

## Run API Only

From monorepo root:

```bash
npm run dev:api
```

Build + run production bundle:

```bash
npm run build --workspace @vibe-store/api
npm run start --workspace @vibe-store/api
```

## Error Codes

- `ADDRESS_NOT_FOUND`
- `INVALID_CATEGORY`
- `VALIDATION_ERROR`
- `PLACES_UPSTREAM_ERROR`
- `RATE_LIMIT`
- `TIMEOUT`
- `REPORT_NOT_FOUND`

Error payload format:

```json
{
  "errorCode": "ADDRESS_NOT_FOUND",
  "message": "No se encontró una ubicación válida para la dirección.",
  "details": { "traceId": "..." }
}
```
