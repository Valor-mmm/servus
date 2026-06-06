## Why

The current design system (the cold Tailwind-slate dark mode plus the
half-finished light palette) was the placeholder language we shipped to get the
app working — it does not feel Bavarian, the owner is "not proud of it," and
several CSS classes referenced by components have never been defined. The
upcoming move makes daily use unavoidable, so the app needs a visual register
the owner is happy to live in every day, on the phone, while packing boxes.

Following a five-direction design exploration
(`docs/review/pre-launch-2026-06-03/design-exploration/`), the owner picked two
themes to ship together: **Raute** (Direction A — heraldic / Bavarian flag) as
the light theme, and **Sternenhimmel** (Direction G — alpine starry sky) as the
dark theme. They are deliberately a sibling pair: Sternenhimmel is Raute at
night — same lozenge motif, same condensed display type, deep midnight ground
with peak silhouettes and faint stars instead of parchment.

## What Changes

User-visible:

- **BREAKING** The entire visual language of the app changes. The current cold
  Tailwind-slate dark mode and the half-finished light palette are replaced with
  two themes built from new mocks: Raute (light) and Sternenhimmel (dark).
- Both themes use a heraldic-flag identity (the Bavarian Raute lozenge as a
  structural motif at section breaks and active-nav states) and a condensed
  display typeface (DIN family in light, Roboto Condensed in dark).
- A new **user-controllable theme toggle** appears in the desktop top nav and as
  a small floating button on mobile. The choice persists in `localStorage` and
  survives reloads.
- System preference (`prefers-color-scheme: dark`) determines the default on a
  user's first visit only — once they toggle, their choice wins.
- An inline pre-paint script applies the chosen theme before first paint, so
  there is no flash of the wrong theme on load.
- Status badges, buttons, the box-detail plaque, the items list rows, the
  top/bottom nav, and empty states all gain the new visual language. Each
  component must render correctly in both themes.
- The currently broken CSS classes (`.auth-page`, `.photo-gallery`,
  `.photo-gallery-img`, `.qty-controls`, `.qty-label`, `.badge-pending`,
  `.photo-capture`, `.photo-capture--multi`, `.capture-btn`, `.capture-error`)
  are defined as part of this overhaul so every page renders cleanly in both
  themes.

Internal / tokens:

- Design tokens (`--servus-*` custom properties) are restructured so that the
  same component CSS reads from theme-scoped tokens. Each theme is a
  `html.theme-raute { ... }` or `html.theme-sternenhimmel { ... }` block that
  redefines the same set of tokens.
- The token set is designed to accommodate a **third theme**
  (`theme-laerchenholz`, Direction F — the alpine summer theme deferred from
  this change) without another schema change. Adding it later means a new
  `html.theme-*` block plus registering the theme in the toggle, nothing else.
- Fonts: Inter (already in use), Roboto Condensed (new — Google Fonts, used by
  Sternenhimmel display type). DIN family is referenced via system fallback
  (`"DIN Alternate", "DIN Pro", "Roboto Condensed", system-ui`) so no additional
  font asset is loaded for Raute display.

## Non-goals

- **Direction F (Lärchenholz, alpine).** Out of scope. The token system will
  support a third theme, but the third theme itself is not shipped here.
- **Items browse performance** (`ui-items-browse-performance` design brief).
  Separate change; not touched here.
- **KV schema, auth, business logic.** Untouched. This is purely visual.
- **Lion mascot illustration.** The existing SVG asset is reused unchanged. The
  way it's used (heraldic stamp in Raute, gold-on-night stamp in Sternenhimmel)
  is described, but no new artwork is commissioned.
- **PWA installability.** The existing manifest stays; theme switching does not
  change install behavior. Theme color (`<meta name="theme-color">`) will be
  updated to match the active theme.

## Capabilities

### New Capabilities

None — this change rewrites an existing capability rather than introducing a new
one.

### Modified Capabilities

- `design-system`: the entire spec is rewritten. Palette, dark-mode requirement,
  navigation, button/badge variants, layout, and the theme switcher all change.
  Requirements that remain conceptually identical (e.g. comfortable UX, mobile
  touch-target minimum) are restated in the new language for clarity rather than
  left as residue from the previous spec. Lion mascot, PWA, and micro-animation
  requirements are preserved with theme-adapted detail.

## Impact

Code:

- `routes/_app.tsx` — global stylesheet replaced; inline pre-paint script for
  theme application added to `<head>`; `<meta name="theme-color">` made dynamic.
- `static/styles.css` (or equivalent global stylesheet location) — rewritten
  around the two-theme token system.
- `islands/ThemeToggle.tsx` (new) — controls localStorage + class swap on
  `<html>`.
- `components/` — top nav, bottom nav, status badge, item row, box plaque,
  empty-state, button variants all updated to the new component CSS. Where
  components today emit inline styles or theme-specific classes, those are
  refactored to read from the token system.
- `lib/i18n/locales/de.ts` — new strings: theme toggle label, theme names (Hell
  / Dunkel), aria-labels for the toggle, and any new copy introduced by empty
  states.
- `tests/unit/` — token presence tests, theme toggle island unit tests.
- `tests/e2e/` — new Playwright spec exercising the theme toggle: switch
  light↔dark, reload survives, system-preference default on first visit, no
  flash of wrong theme on load.

Dependencies:

- **Add** Google Font `Roboto Condensed` (loaded only when Sternenhimmel is
  active, via a conditional `<link>` to keep the light theme weight low).
- No new npm/JSR packages.

Risk:

- Replacing every page's CSS at once is a wide surface change. Mitigated by TDD
  per task, the existing E2E suite (68 specs) catching regressions, and a new
  theme-switcher E2E covering the switch + persistence paths.
- A user with strong colour-vision preferences may dislike a theme; the toggle
  gives them an immediate out. No hidden-theme fallback is provided.
