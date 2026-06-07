## 1. Token scaffolding and theme classes

- [x] 1.1 Add a failing unit test asserting that `:root` defines the
      theme-agnostic token set (`--servus-radius`, `--servus-radius-pill`,
      `--servus-space-1`..`--servus-space-8`, `--servus-type-display-family`,
      `--servus-type-body-family`)
- [x] 1.2 Stand up the new global stylesheet at the existing `static/styles.css`
      (or Fresh equivalent) with a `:root` block containing the theme-agnostic
      tokens; remove the old hard-coded values
- [x] 1.3 Add a failing unit test asserting that `html.theme-raute` and
      `html.theme-sternenhimmel` each define the full theme token set with the
      exact hex values from the spec
- [x] 1.4 Implement the `html.theme-raute` and `html.theme-sternenhimmel` blocks
      in the stylesheet using the palettes from the spec
- [x] 1.5 Add a failing static-check test (grep-based or AST-based) that asserts
      no component CSS file contains the literal `theme-raute` or
      `theme-sternenhimmel` selector
- [x] 1.6 Sweep the codebase to remove any leftover `html.dark` selectors;
      replace with token references in component CSS

## 2. Pre-paint theme application

- [x] 2.1 Add a failing unit test for a pure
      `resolveInitialTheme(storedValue, systemPrefersDark)` helper covering:
      valid stored value wins; invalid stored value falls through; system-dark →
      `sternenhimmel`; system-light → `raute`; undefined → `raute`
- [x] 2.2 Implement `lib/styles/theme.ts` exporting `resolveInitialTheme` and
      the `THEMES` constant; both reused server-side and client-side
- [x] 2.3 Add a failing E2E test that asserts the initial `<html>` class is
      `theme-raute` or `theme-sternenhimmel` (never `dark`)
- [x] 2.4 Update `routes/_app.tsx` to inject the inline pre-paint `<script>` in
      `<head>` before the stylesheet `<link>`; script calls
      `resolveInitialTheme` and sets `html.classList`
- [x] 2.5 Add a failing unit test asserting the initial
      `<meta name="theme-color">` content matches the active theme (`#0E4FA0`
      for Raute, `#0E1830` for Sternenhimmel)
- [x] 2.6 Update `routes/_app.tsx` to render `<meta name="theme-color">` with
      the correct content based on a server-side theme guess (cookie fallback
      `raute`), then update via the pre-paint script

## 3. Theme toggle island

- [x] 3.1 Add a failing unit test for `ThemeToggle` that asserts a click swaps
      the `html` class, writes `localStorage["servus-theme"]`, and updates the
      `<meta name="theme-color">` content
- [x] 3.2 Implement `islands/ThemeToggle.tsx` reading and writing the same
      `THEMES` constant from `lib/styles/theme.ts`
- [x] 3.3 Add a failing unit test asserting that toggling to
      `theme-sternenhimmel` appends a `<link rel="stylesheet">` for Roboto
      Condensed to `<head>` if not already present
- [x] 3.4 Implement the conditional Roboto Condensed `<link>` insertion in both
      the pre-paint script and the toggle island
- [x] 3.5 Add the `ThemeToggle` island to the top navigation (≥ 768 px) and to a
      fixed mobile FAB position (< 768 px); use `aria-label` from `de.ts` for
      accessibility
- [x] 3.6 Add German strings to `lib/i18n/locales/de.ts` — keys for theme toggle
      label, the two theme names (`Hell` / `Dunkel`), and the FAB aria-label

## 4. Button class variants

- [x] 4.1 Add a failing unit test asserting `.btn-primary`, `.btn-secondary`,
      `.btn-danger`, and `.btn-small` resolve to non-empty computed styles and
      `.btn-primary` uses `--servus-primary` as `background-color`
- [x] 4.2 Implement the four button class variants in the new stylesheet,
      reading all colors from tokens; corner radius uses `--servus-radius`
- [x] 4.3 Add a failing E2E test asserting that the same `.btn-primary` on
      `/login` renders blue under Raute and gold under Sternenhimmel (verified
      by computed background colour)
- [x] 4.4 Add a focus-visible outline rule for `.btn-*` using `--servus-accent`
      with 3 px outline-offset; verified by a unit test

## 5. Box status badges

- [x] 5.1 Add a failing unit test asserting `.badge-empty`, `.badge-packed`,
      `.badge-delivered`, and `.badge-pending` each render a leading shape
      indicator (an SVG or pseudo-element with non-zero dimensions) before the
      status text
- [x] 5.2 Implement the four badge variants reading colors from tokens;
      `.badge-packed` uses `--servus-primary`; `.badge-delivered` uses a
      forest-green token added to both themes; `.badge-pending` uses
      `--servus-spark`
- [x] 5.3 Add a failing E2E test that loads a delivered box detail page under
      both themes and confirms the badge background colour matches the active
      theme's delivered token

## 6. Top and bottom navigation

- [x] 6.1 Add a failing unit test that asserts the `<nav class="top-nav">` and
      `<nav class="bottom-nav">` containers exist with the correct links and
      visibility breakpoints (≥/< 768 px)
- [x] 6.2 Refactor `components/Nav.tsx` (or equivalent) to read all colors from
      tokens; remove any inline styles or `html.dark` references
- [x] 6.3 Add a failing E2E test that verifies the top nav is visible on desktop
      and the bottom nav is visible on mobile, with both nav links working under
      both themes

## 7. Active navigation indicator

- [x] 7.1 Add a failing unit test that asserts a Raute-active nav link renders a
      filled gold lozenge background (uses a known CSS class or SVG ref) and a
      Sternenhimmel-active nav link renders a 2 px gold bottom border
- [x] 7.2 Implement the active indicator in `components/Nav.tsx` using a single
      `.nav-active` class; the lozenge-vs-underline split is expressed via
      tokens and a CSS background-image that is empty under Sternenhimmel
- [x] 7.3 Add a failing E2E test that navigates to `/items` and asserts the
      "Items" link has the active treatment in both top and bottom nav, under
      both themes

## 8. Quick-add visual distinction

- [x] 8.1 Add a failing unit test asserting `.nav-quick-add` renders as a raised
      circular button with a non-empty `box-shadow` and a background that
      resolves to `--servus-primary`
- [x] 8.2 Implement the `.nav-quick-add` treatment with theme-adaptive
      `box-shadow` (Sternenhimmel adds a soft gold glow via a token-driven
      shadow color)
- [x] 8.3 Add a failing E2E test asserting `.nav-quick-add` is visibly larger
      than other bottom-nav items at the 375 px viewport

## 9. Raute lozenge motif

- [ ] 9.1 Add a failing unit test asserting that the lozenge SVG component
      (`components/Lozenge.tsx` or `static/lozenge.svg`) renders with a
      `currentColor` fill and a `--servus-motif-stroke` stroke
- [ ] 9.2 Implement the reusable lozenge SVG/CSS pattern
- [ ] 9.3 Add a failing E2E test that asserts the `/login` page under
      `theme-raute` renders the diagonal lozenge pattern in the splash panel
      (assertion: pattern background-image is non-empty)
- [ ] 9.4 Wire the lozenge motif into the login splash and into a
      `.section-break` component used by the items list and box detail

## 10. Sternenhimmel night-sky motif

- [ ] 10.1 Add a failing unit test asserting that under `theme-sternenhimmel`
      the `<body>` has a `background-image` that contains a `radial-gradient`
      pattern (the star scatter), and that under `theme-raute` the same
      `background-image` is `none`
- [ ] 10.2 Implement the star scatter as a `body` background pattern scoped
      under `html.theme-sternenhimmel`
- [ ] 10.3 Add a failing unit test asserting that the peak silhouette component
      renders an SVG with `fill: var(--servus-horizon-fill)`
- [ ] 10.4 Implement the peak silhouette component and wire it into the login
      splash, the items page header, and the `.section-break`
- [ ] 10.5 Add a failing E2E test asserting exactly one `--servus-spark`-colored
      element is visible near the peak silhouette on `/login` under
      Sternenhimmel
- [ ] 10.6 Implement the single Fensterlicht spark placement

## 11. Display typography per theme

- [ ] 11.1 Add a failing unit test asserting that
      `getComputedStyle(headingEl).fontFamily` under Raute starts with
      `DIN Alternate` and under Sternenhimmel starts with `Roboto Condensed`
- [ ] 11.2 Set `--servus-type-display-family` in each theme block with the
      correct stack; remove any hard-coded `font-family` in headings
- [ ] 11.3 Add a failing network-assertion E2E test that under `theme-raute` no
      request to `fonts.googleapis.com/css*?family=Roboto+Condensed` is made
- [ ] 11.4 Implement the conditional Roboto Condensed load inside the pre-paint
      script and ThemeToggle island, both using a shared helper from
      `lib/styles/theme.ts`

## 12. Define previously-broken CSS classes

- [ ] 12.1 Add a failing unit test that asserts each of the following classes
      resolves to a non-empty computed style block when rendered: `.auth-page`,
      `.photo-gallery`, `.photo-gallery-img`, `.qty-controls`, `.qty-label`,
      `.badge-pending`, `.photo-capture`, `.photo-capture--multi`,
      `.capture-btn`, `.capture-error`
- [ ] 12.2 Define `.auth-page` as a centered card layout (used by
      `routes/login.tsx`) under both themes
- [ ] 12.3 Define `.photo-gallery` and `.photo-gallery-img` for the item detail
      page photo grid; sizes constrained on mobile
- [ ] 12.4 Define `.qty-controls` and `.qty-label` for the quantity island with
      the `min-height: 44px` mobile touch target
- [ ] 12.5 Define `.badge-pending` (covered alongside Task 5 if practical)
- [ ] 12.6 Define `.photo-capture`, `.photo-capture--multi`, `.capture-btn`, and
      `.capture-error` for the photo capture island

## 13. Item rows, box plaque, and remaining page chrome

- [ ] 13.1 Add a failing E2E test that screenshots `/items` and `/boxes/:id`
      under both themes at 375 px and 1280 px viewports and asserts no
      horizontal overflow occurs
- [ ] 13.2 Update item-row component CSS to match the mocks: 64 px category
      plate / brass tag on the left, name + meta column, status badge, quantity
      control
- [ ] 13.3 Update box-detail hero composition to match the mocks: 132 px plaque
      on the left containing the box code, hero title + meta grid, large status
      badge
- [ ] 13.4 Update page header, filter row, search field, and the `.load-all`
      link styling to the new tokens

## 14. PWA theme-color and manifest sanity

- [ ] 14.1 Add a failing E2E test asserting that toggling theme updates
      `<meta name="theme-color">` `content` attribute within the same animation
      frame
- [ ] 14.2 Implement the meta-color update inside the ThemeToggle island
- [ ] 14.3 Verify `static/manifest.json` `theme_color` is `#0E4FA0` (Raute
      primary); update if required and adjust the manifest unit test

## 15. Per-route smoke pass

- [ ] 15.1 Add a Playwright "smoke" spec that loops every authenticated route
      (`/`, `/items`, `/items/quick-add`, `/items/:id`, `/items/:id/edit`,
      `/boxes`, `/boxes/:id`, `/categories`, `/rooms`, `/invites`) plus
      `/login`, navigates under both themes, asserts each renders without
      console errors and without layout overflow at 375 px and 1280 px
- [ ] 15.2 Fix any regressions surfaced by the smoke pass

## 16. Update affected specs and validate

- [ ] 16.1 Run `openspec validate themes-raute-sternenhimmel --strict` and fix
      any reported issues
- [ ] 16.2 Run `deno task fmt`, `deno task lint`, `deno check **/*.ts` and fix
      any issues
- [ ] 16.3 Run `deno task test` (unit + integration) and confirm all green

## 17. Playwright E2E for the theme switcher

- [ ] 17.1 Write `tests/e2e/theme-switcher.spec.ts` covering: (a) first visit
      with no stored preference and OS dark → app loads under Sternenhimmel; (b)
      user toggles to Raute → reload preserves Raute; (c) user with stored
      Sternenhimmel loads any page → no flash of Raute observed in the first 100
      ms (screenshot dominant-color assertion); (d) toggle updates
      `<meta name="theme-color">`
- [ ] 17.2 Run `deno task e2e` and confirm the new spec + the full E2E suite
      pass green
