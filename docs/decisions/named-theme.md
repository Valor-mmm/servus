# Decision: named theme system

**Date:** 2026-04  
**Change:** `themes-raute-sternenhimmel`

## Context

The app launched with a single Bavarian-blue color palette. The owners wanted the
option to switch to a different look without a full redesign. The original design
used CSS custom properties (design tokens) throughout, which made theming
feasible.

## Decision

Introduce named themes as additional CSS property sets applied via a `data-theme`
attribute on `<html>`. Two themes shipped: `raute` (the original diamond/blue
palette) and `sternenhimmel` (a dark starfield palette). Theme preference is
stored server-side in the session (one KV write per theme change) so it persists
across devices without JS-local-storage gymnastics.

A theme switcher is exposed in the nav for admin users. The default theme is
`raute`.

## Alternatives considered

- **CSS `@media (prefers-color-scheme: dark)`** — already in place for system
  dark mode; named themes are in addition, not instead.
- **Per-user theme stored in the user record** — would survive logout but adds
  schema complexity for a cosmetic preference; session storage is sufficient.
- **JS-only switching** — avoided because the Deno Deploy edge delivery means
  server-side is just as fast, and no JS flash-of-wrong-theme.

## Consequences

The `design-system` openspec spec now describes the named-theme layer rather than
only the token system. Adding a third theme is a single CSS block + one enum
value change.
