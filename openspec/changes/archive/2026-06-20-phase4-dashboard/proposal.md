## Why

The home page (`/`) currently shows three static lines with no app data. Users
land on it after login with no orientation: they don't know how many items they
have, whether triage is needed, or what boxes are ready. A dashboard gives
immediate situational awareness for the move.

## What Changes

- Replace the static `/` route with a server-rendered dashboard
- Show: total item count, count of incomplete items (linked to
  `/items/incomplete`), packed-box ratio (n/total), last 5 recently-added items
  with thumbnails, and a prominent "Erfassen" CTA button
- Uses only existing data-fetching functions (`listItems`, `listBoxes` from
  `itemRepo.ts` / `boxRepo.ts`) — no new KV queries

## Capabilities

### New Capabilities

None — dashboard is an implementation of the existing home route using existing
inventory and boxes capabilities.

### Modified Capabilities

- `inventory`: Home route now displays live inventory summary data

## Impact

- `routes/index.tsx` — rewritten; now fetches data server-side
- No new islands needed (static SSR dashboard)
- No new dependencies or KV schema changes
