# Design System Specification

## ADDED Requirements

### Requirement: Comfortable and efficient UX

Every user-facing interaction MUST be reachable within two taps from the home
screen on a mobile viewport. Primary actions (create item, add to box, mark
delivered) MUST be the most visually prominent element on their respective
pages. Empty states MUST display the lion illustration and a short German prompt
so the app feels alive even when no data exists yet.

#### Scenario: Primary CTA is visually prominent

- **WHEN** a user visits a list page (items, boxes) with no filters active
- **THEN** the primary action button is the most visually prominent interactive
  element on the page (largest, highest contrast, or most distinctly colored)

#### Scenario: Empty state shows lion and prompt

- **WHEN** an authenticated user visits `/items` or `/boxes` and the list is
  empty
- **THEN** the lion SVG and a German prompt are displayed rather than a blank
  page or unstyled text

#### Scenario: Success states are acknowledged

- **WHEN** a user completes a significant action (item created, box delivered)
- **THEN** the UI provides clear visual feedback that the action succeeded
  (redirect to updated view, badge change, or animation)

---

### Requirement: CSS design tokens

The stylesheet MUST define all color, spacing, border-radius, and shadow values
as CSS custom properties on `:root` under a `--servus-*` namespace. No
hard-coded color or spacing values MAY appear outside the token definitions.

#### Scenario: Token-based theming

- **WHEN** the stylesheet is loaded
- **THEN** CSS custom properties `--servus-bg`, `--servus-surface`,
  `--servus-text`, `--servus-primary`, `--servus-primary-hover`,
  `--servus-accent`, `--servus-danger`, `--servus-border`, and `--servus-radius`
  are defined on `:root`

---

### Requirement: Bavarian color palette

The default (light) theme MUST use the Bavarian palette: rich blue (`#1A5FA8`)
as the primary action color, warm parchment (`#FDF8F0`) as the page background,
and lion gold (`#C5900A`) as the accent. Text on light backgrounds MUST meet
WCAG AA contrast (4.5:1 for body text).

#### Scenario: Primary button uses Bavarian blue

- **WHEN** a page with a `.btn-primary` button is rendered in light mode
- **THEN** the button background is the primary blue token value and the text is
  white

#### Scenario: Page background is parchment

- **WHEN** the app is loaded in light mode
- **THEN** the `<body>` background matches the parchment token (`#FDF8F0` or
  equivalent warm off-white)

---

### Requirement: Dark mode via system preference

The stylesheet MUST provide a `@media (prefers-color-scheme: dark)` block that
overrides all `--servus-*` color tokens with dark-theme equivalents. No
JavaScript or class toggling is required.

#### Scenario: Dark background on dark-mode system

- **WHEN** the device OS is set to dark mode
- **THEN** the page background renders as a dark tone (approximately `#111827`
  or darker), not the light parchment

#### Scenario: Text remains legible in dark mode

- **WHEN** dark mode is active
- **THEN** body text color is a light tone (approximately `#F9FAFB`) against the
  dark background, maintaining WCAG AA contrast

---

### Requirement: Button class variants

The stylesheet MUST define the following button classes, each with hover and
active states:

- `.btn-primary` — Bavarian blue background, white text (the default bare
  `button` style)
- `.btn-secondary` — neutral surface background, border, muted text
- `.btn-danger` — red background, white text
- `.btn-small` — reduced padding and font-size modifier, combinable with any of
  the above

#### Scenario: `.btn-primary` renders in primary color

- **WHEN** a button with class `btn-primary` is rendered
- **THEN** its background uses the `--servus-primary` token

#### Scenario: `.btn-danger` renders in red

- **WHEN** a button with class `btn-danger` is rendered
- **THEN** its background uses the `--servus-danger` token

#### Scenario: `.btn-small` reduces size

- **WHEN** a button with class `btn-small` is rendered alongside a standard
  button
- **THEN** it is visibly smaller in both padding and font-size

---

### Requirement: Box status badges

Box status values MUST be displayed as colored badge chips. The color MUST
convey the status at a glance without relying on text alone:

- `empty` → neutral gray
- `packed` → Bavarian blue
- `delivered` → forest green

#### Scenario: Packed badge is blue

- **WHEN** a box list or detail page renders a packed box
- **THEN** the status chip has a blue background corresponding to the primary
  palette

#### Scenario: Delivered badge is green

- **WHEN** a box list or detail page renders a delivered box
- **THEN** the status chip has a green background distinct from the blue packed
  badge

---

### Requirement: Bottom navigation bar

When a user is authenticated the app MUST render a bottom navigation bar visible
on viewports narrower than 768 px. The bar MUST contain links to Items, Boxes,
Categories, and Rooms, and a logout action. A top navigation bar MUST be shown
instead on viewports 768 px and wider.

#### Scenario: Bottom nav visible on narrow viewport

- **WHEN** an authenticated user views the app on a viewport narrower than 768
  px
- **THEN** a `nav.bottom-nav` element is visible at the bottom of the screen

#### Scenario: Top nav visible on wide viewport

- **WHEN** an authenticated user views the app on a viewport 768 px or wider
- **THEN** a `nav.top-nav` element is visible and `nav.bottom-nav` is hidden

#### Scenario: Bottom nav contains required links

- **WHEN** the bottom nav is rendered
- **THEN** it contains links to `/items`, `/boxes`, `/categories`, `/rooms`, and
  a logout form

---

### Requirement: Lion mascot asset

The app MUST serve a geometric Bavarian lion SVG at `/lion.svg`. The SVG MUST be
used as the app logo in the navigation bar and as the empty-state illustration
when a list (items, boxes) has no entries.

#### Scenario: Lion SVG is reachable

- **WHEN** a browser requests `/lion.svg`
- **THEN** the server responds with a valid SVG document

#### Scenario: Lion appears in empty item list

- **WHEN** an authenticated user visits `/items` and no items exist
- **THEN** the lion SVG illustration is visible on the page

---

### Requirement: Micro-animations

The app MUST apply the following animations; all MUST respect
`prefers-reduced-motion` by falling back to no animation:

- **Fade-up on list render**: list items fade in from slightly below their final
  position on initial render.
- **Scale on button press**: interactive buttons scale down slightly on
  `:active`.
- **Confetti on delivery**: a one-time canvas confetti burst plays when a box
  detail page loads with a `?delivered=1` query parameter.

#### Scenario: List items fade up on load

- **WHEN** the items or boxes list page is rendered
- **THEN** list entries animate in with a fade-up transition

#### Scenario: Confetti fires on delivery redirect

- **WHEN** a packed box is marked as delivered and the page reloads with
  `?delivered=1`
- **THEN** a brief confetti animation plays automatically without user input

#### Scenario: Animations disabled with reduced-motion preference

- **WHEN** the device has `prefers-reduced-motion: reduce` set
- **THEN** list items appear without animation and the confetti does not play

---

### Requirement: PWA installability

The app MUST be installable as a Progressive Web App on iOS and Android. The
HTML document MUST include a `<link rel="manifest">` pointing to
`/manifest.json`. The manifest MUST specify `display: "standalone"`, a short
name, a theme color matching the Bavarian blue token, and at least one icon.
Apple-specific `<meta>` tags for `apple-mobile-web-app-capable` and
`apple-mobile-web-app-status-bar-style` MUST be present in `<head>`.

#### Scenario: Manifest link present in HTML

- **WHEN** any page of the app is loaded
- **THEN** the HTML `<head>` contains
  `<link rel="manifest" href="/manifest.json">`

#### Scenario: Manifest is valid JSON

- **WHEN** a browser requests `/manifest.json`
- **THEN** the response is valid JSON with `name`, `short_name`, `display`,
  `theme_color`, and `icons` fields

#### Scenario: App installable on mobile

- **WHEN** an authenticated user visits the app on a mobile browser that
  supports PWA installation
- **THEN** the browser presents an "Add to Home Screen" prompt or install option
