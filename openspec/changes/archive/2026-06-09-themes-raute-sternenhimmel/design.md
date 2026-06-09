## Context

The existing design system was the placeholder language we shipped to make the
inventory MVP usable. It half-ships a Bavarian light palette, layers a generic
cold-slate dark mode on top, and silently references CSS classes that have never
been defined (`.auth-page`, `.photo-gallery`, `.qty-controls`, `.photo-capture`
and friends). The result reads as "default tech app with some blue," which is
the opposite of the Bavarian-household identity the project is aiming for.

A five-direction visual exploration
(`docs/review/pre-launch-2026-06-03/design-exploration/`) narrowed to two themes
the owner wants to ship now:

- **Raute** (Direction A) — heraldic, the Bavarian flag treated as the app's
  structural grid. Bold, modernist, condensed display type, parchment ground,
  blue/white/gold tokens.
- **Sternenhimmel** (Direction G) — the same heraldic discipline at night.
  Midnight ground with faint stars, A's lozenge motif still visible (muted
  flag-blue lines on dark), peak silhouettes as the horizon, gold star
  pinpoints, one warm-orange "Fensterlicht" accent.

Both themes are mocked at production fidelity in `mocks/direction-a/` and
`mocks/direction-g/` (login, items list, box detail).

A third theme — **Lärchenholz** (Direction F, alpine summer wood) — was
explicitly deferred. The token architecture below must allow adding it later as
a third `html.theme-*` block without restructuring components.

## Goals / Non-Goals

**Goals:**

- Two complete, switchable themes (Raute / Sternenhimmel) that share component
  CSS and differ only in token values.
- User-controllable toggle with `localStorage` persistence, system-preference
  default on first visit, no flash of the wrong theme on load.
- Every CSS class referenced from existing TSX components is defined in the new
  stylesheet so no page renders broken in either theme.
- The token system anticipates a future third theme — `html.theme-laerchenholz`
  can be added later without component edits.
- The two themes feel like deliberate siblings (Sternenhimmel reads as "Raute at
  dusk"), not like two unrelated visual languages bolted together.

**Non-Goals:**

- Lärchenholz implementation. Tokens are designed to support it; no Lärchenholz
  CSS or toggle entry ships in this change.
- Tailwind, Panda, vanilla-extract, or any CSS-in-JS migration. Plain
  hand-written CSS with custom properties, like today.
- Touching auth, KV, business logic, or photo handling. Pure visual change.
- A separate "high-contrast" or "system" theme mode beyond the two named themes
  plus the system-preference default-on-first-visit behavior.

## Decisions

### D1: Theme as a class on `<html>`, not a media query alone

The active theme is applied by setting `html.theme-raute` or
`html.theme-sternenhimmel` on the document element. The previous design used
`html.dark` for dark mode; that gets replaced.

The selector pattern in CSS is:

```css
:root {
  /* tokens that are theme-agnostic — radii, spacing, type scale */
}

html.theme-raute {
  /* full token set for Raute */
}

html.theme-sternenhimmel {
  /* full token set for Sternenhimmel */
}
```

No theme styling lives directly on `:root` or `html` unscoped. This guarantees
that adding `html.theme-laerchenholz` later is purely additive.

**Alternatives considered:**

- _Media-query-driven theming only_ (`@media (prefers-color-scheme: dark)`):
  rejected because the owner explicitly wants a user-controllable toggle that
  overrides system preference.
- _CSS attribute selector_ (`html[data-theme="raute"]`): equivalent
  functionally, but `class` is what the existing codebase already manipulates
  and the inline pre-paint script. No reason to switch.
- _Component-level theme prop_: rejected. Forces every component to know the
  theme; bloats islands; defeats the point of cascading custom properties.

### D2: System preference applies only when no `localStorage` value exists

`localStorage["servus-theme"]` is the source of truth. Values are
`"raute" | "sternenhimmel"`. (We do NOT store `"light" | "dark"` so that adding
a third theme later does not require a value migration.) If the key is absent on
first visit, the inline pre-paint script reads
`window.matchMedia("(prefers-color-scheme: dark)")` and applies
`theme-sternenhimmel` if the OS is dark, otherwise `theme-raute`. The value is
**not** written to `localStorage` automatically — only an explicit toggle
writes. This keeps the system preference live until the user expresses a choice.

**Rationale:** if we wrote a default on first visit, a user with system dark
mode who later switched their OS to light would still get the old default —
worse UX than respecting OS until they pick.

### D3: Inline pre-paint script in `<head>`, hand-written, no bundler

The flash-prevention script is a 10-line synchronous inline `<script>` placed in
`<head>` before the stylesheet `<link>`. It cannot be an island (islands are
hydrated after first paint). The script:

1. Reads `localStorage["servus-theme"]`.
2. If valid (`"raute"` or `"sternenhimmel"`), applies it.
3. Otherwise reads `prefers-color-scheme: dark` and applies one of the two
   themes.
4. As a final safety, if for any reason neither classifies, defaults to
   `theme-raute`.

This script is identical between server-render and post-hydration; the
`ThemeToggle` island only handles user toggle events and `localStorage` writes.

**Alternatives considered:**

- _Server-side detection from a cookie_: rejected. Adds a request-time write to
  every login session, complicates cookie size and CSRF, and Deno KV would also
  need to track it for cross-device sync (which we don't want).
- _Storing the inline script in a separate file_: rejected — it's 10 lines.
  Inlining avoids an extra request before first paint.

### D4: Token namespace — extend, don't replace, `--servus-*`

Existing tokens stay under `--servus-*`. New tokens that are specific to the new
themes (motif strokes, peak silhouette fill, star colors) get descriptive
suffixes: `--servus-motif-stroke`, `--servus-horizon-fill`, `--servus-spark`.

A small set of tokens are **structural / theme-agnostic**: `--servus-radius`,
`--servus-radius-pill`, `--servus-space-*`, `--servus-type-display-family`,
`--servus-type-body-family`. These live on `:root` only and are not overridden
per theme.

A subtle point: `--servus-type-display-family` IS theme-specific (Raute uses the
DIN system stack, Sternenhimmel uses Roboto Condensed) — but only the _value_
differs; the token name is the same. So the structural rule is "type family
token name is shared across themes, value per theme."

### D5: Font loading — conditional Roboto Condensed

Inter is loaded unconditionally (used by both themes for body and forms). DIN is
referenced via the system-font stack
(`"DIN Alternate", "DIN Pro",
"Roboto Condensed", system-ui`) and requires no
external font load for Raute on most desktop OSes. Roboto Condensed is loaded
for Sternenhimmel.

To keep the light theme weight low, the Roboto Condensed `<link>` is added
_conditionally_ by the same pre-paint script: when the resolved theme is
`sternenhimmel`, the script appends a `<link>` to Google Fonts before stylesheet
parse. When the user toggles to dark later, the link is added on toggle if not
already present. There is no removal — once loaded in a session, the font stays
loaded (cheap memory cost).

**Alternatives considered:**

- _Load both fonts always_: rejected. Doubles the font footprint for users who
  stay in light theme.
- _Self-host Roboto Condensed_: better for privacy and offline PWA, deferred to
  a follow-up (no fonts are self-hosted today; doing it for one font alone is
  inconsistent).

### D6: The lozenge motif is one SVG, two color modes

The Raute lozenge motif (used at section breaks, login splash, the quick-add
button background) is implemented as a single inline SVG pattern referenced via
`currentColor` and a token-driven secondary stroke. The same SVG is reused in
Sternenhimmel where the stroke uses `--servus-motif-stroke` (muted flag-blue at
night). No separate dark-mode asset.

### D7: Empty-state and login splash get theme-specific composition

The login splash (in particular) is the most theme-distinct surface:

- Raute: a parchment + blue-flag split panel with white lozenge geometry.
- Sternenhimmel: a midnight + peak-silhouette panel with star scatter and a
  single Fensterlicht spark.

These two compositions are separate CSS blocks (selected by the theme class)
rather than token-only variations, because their _structure_ differs — the sky
panel has the peak silhouette SVG; the flag panel doesn't.

Outside the login splash, the rest of the app uses token-only swaps. The overall
token coverage is wide enough that no `if (theme === 'raute')` checks appear in
TSX.

### D8: `theme-color` meta updates on toggle

The `<meta name="theme-color">` tag determines the iOS/Android browser chrome
color. We keep one tag and update its `content` attribute on toggle — the
`ThemeToggle` island writes `#0E4FA0` (Raute primary) for Raute and `#0E1830`
(Sternenhimmel ground) for Sternenhimmel. Initial render value is chosen by the
same logic as the pre-paint script (server-rendered before hydration).

### D9: Test coverage strategy

- **Unit tests** verify token presence per theme by mounting an in-memory
  `Document` and checking `getComputedStyle`. These are fast and catch drift.
- **Integration tests** mount the `ThemeToggle` island under each theme and
  assert localStorage + class swap behavior.
- **Playwright E2E** exercises the full user flow: first visit respects system
  preference, toggle persists across reload, no flash of wrong theme on load
  (captured by taking a screenshot in the first 100 ms after navigation and
  asserting the dominant background color).

The no-flash assertion is the highest-value E2E because it can only be verified
end-to-end — a unit test cannot observe a first-paint flash.

## Risks / Trade-offs

**Risk:** Replacing every page's styling at once is a wide change that can
silently break visual regressions.

- **Mitigation:** TDD per task; the existing 68 E2E specs verify behavior; add a
  per-route Playwright "smoke" spec that screenshots each route under each theme
  and fails on layout overflow or text-clipping at 375px and 1280px viewports.

**Risk:** The conditional Roboto Condensed load on toggle may FOUT (flash of
unstyled text) on the first switch.

- **Mitigation:** apply `font-display: swap` in the Google Fonts URL so the
  fallback (system condensed) renders immediately and is replaced imperceptibly.
  Acceptable trade-off vs. doubling font weight on every visit.

**Risk:** Stale `localStorage` value (e.g., `"dark"` from a previous user) makes
the pre-paint script fall through to default.

- **Mitigation:** the script validates the value is one of
  `"raute" |
  "sternenhimmel"`; anything else is treated as no preference and
  the system-preference path runs. No migration needed.

**Risk:** A future third theme (Lärchenholz) needs a token that doesn't exist
yet (e.g., a wood-grain pattern token).

- **Mitigation:** the token namespace is intentionally extensible. Adding a new
  token + a new theme class block is a purely additive change. Component CSS
  does not need to know which themes exist.

**Risk:** Owners on slow hardware notice the first-paint script run as a delay.

- **Mitigation:** the script is < 1 KB minified and runs synchronously in the
  head, before stylesheet fetch. On modern hardware it completes in
  microseconds. Mobile testing on the owner's iPhone is part of the acceptance
  criteria.

## Migration Plan

This is a visual replacement, not a data migration.

1. Ship the new stylesheet, theme classes, `ThemeToggle` island, pre-paint
   script, and updated component CSS in one PR.
2. On deploy, every existing session's `localStorage["servus-theme"]` (if it
   contains the old `"dark"` value) is treated as absent by the new script.
   Users get the system-preference default on first visit after deploy. This is
   acceptable — there are at most two real users.
3. No KV migration. No DB migration. The `boxes`, `items`, `auth`, `invites`,
   and `photos` capabilities are unaffected.
4. Rollback: revert the PR. Old stylesheet returns. No data is lost.

## Open Questions

- **Q1**: Should the toggle be an icon-only button or labeled? The mocks show
  icon-only (sun/moon). Decision: icon-only with `aria-label` from `de.ts`.
  Revisit if accessibility audit flags it.
- **Q2**: Does the lion mascot need a Sternenhimmel-specific variant (e.g., gold
  instead of blue stamp)? Decision: yes — single SVG with `fill="currentColor"`
  for the body, theme inherits.
- **Q3**: Should the `theme-color` meta animate during transition? Decision: no
  — abrupt change is fine and matches the rest of the toggle.
- **Q4**: Box label print rendering (post-MVP) — does the label respect the
  active theme or always use the light palette? Decision: always Raute
  (printable). Out of scope for this change but flagged so the label component,
  when added, does not adopt the body styles unguarded.
