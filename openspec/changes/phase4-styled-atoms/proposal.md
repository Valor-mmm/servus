## Why

The app has accumulated inconsistent UI patterns across routes: back-links use
different styles, empty states are each hand-rolled differently, item counts say
"1 Gegenstände", and the BottomNav active indicator fires on sub-paths of
`/items` instead of just `/items`. These rough edges reduce trust in the UI.

## What Changes

- Audit and apply `.btn-secondary` consistently to every Zurück/Abbrechen link
  across all routes
- Introduce `EmptyState` component (`components/EmptyState.tsx`) with icon and
  message props; replace every ad-hoc empty-state `<div>`/`<p>` with it
- Add `count(n, singular, plural)` helper to `lib/i18n/t.ts`; apply wherever
  item or box counts are displayed (fixes "1 Gegenstände" etc.)
- Fix BottomNav active-tab logic: `/items` active indicator must not fire for
  `/items/incomplete`, `/items/123`, etc. — use exact match or
  prefix-with-trailing-slash

## Capabilities

### New Capabilities
- `design-system`: Styled-atom shared components and i18n helpers added to the
  existing design system

### Modified Capabilities

None — all changes are implementation-level; existing spec requirements are not
changing.

## Impact

- `components/EmptyState.tsx` — new file
- `lib/i18n/t.ts` — new `count()` export
- `components/BottomNav.tsx` — active-tab fix
- Every route/component that renders an empty state or item count — updated to
  use the new atoms
- No KV schema changes, no new dependencies
