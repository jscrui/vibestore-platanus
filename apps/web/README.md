# Web (Next.js)

Frontend application for Vibe Store.

## Current Status

The frontend is integrated with backend chat + analyze flows:

- chat intake (`/api/chat/session/start`, `/api/chat/session/message`)
- analyze run (`/api/analyze`)
- loading/error states
- score card + bars + insights + competitor list
- report link rendering from backend `report.reportUrl`

Type contracts are shared from `@vibe-store/shared` to keep frontend/backend payloads aligned.

## Run Web Only

From monorepo root:

```bash
npm run dev:web
```

Default URL: `http://localhost:3000`

## Environment

- `NEXT_PUBLIC_API_URL`
  - Recommended: `http://localhost:4000/api`

## Integration Checklist (ongoing)

1. Keep shared contracts updated in `packages/shared/src/index.ts`.
2. Validate API URL with `NEXT_PUBLIC_API_URL`.
3. Extend UI with map/pins if needed (current list view already reads `mapData.competitorsTop`).

## Relevant Files

- `src/app/page.tsx`
- `src/lib/api.ts`
- `src/components/score-bars.tsx`
- `src/app/globals.css`
