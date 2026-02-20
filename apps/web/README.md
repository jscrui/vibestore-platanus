# Web (Next.js)

Frontend application for Vibe Store.

## Current Status

This app currently contains the MVP UI shell:

- input form
- loading/error states
- score card + bars + insights sections
- placeholder competitor map block

Important: frontend calls the backend using `POST /api/analyze`. Remaining migration work is focused on full DTO alignment and richer UI features.

## Run Web Only

From monorepo root:

```bash
npm run dev:web
```

Default URL: `http://localhost:3000`

## Environment

- `NEXT_PUBLIC_API_URL`
  - Recommended: `http://localhost:4000/api`

## Migration Checklist (next frontend step)

1. Update request payload to:
   - `address`
   - `businessCategory` (enum, e.g. `CAFE`)
   - `avgTicket` (`low|mid|high` or number)
   - optional `countryBias`, `placeId`
2. Update response typing to read:
   - `viabilityScore`, `verdict`
   - `metrics`, `hardMetrics`
   - `insights`, `diagnosis`, `recommendationAngle`
   - `mapData.competitorsTop`
   - `report.reportUrl`
3. Add report button linking to `report.reportUrl`.
4. Replace map placeholder with actual map/pins.

## Relevant Files

- `src/app/page.tsx`
- `src/lib/api.ts`
- `src/components/score-bars.tsx`
- `src/app/globals.css`
