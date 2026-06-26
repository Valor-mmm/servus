# Design System Specification

## Purpose

The visual and interaction design system: themes and tokens, color palette,
typography, navigation (desktop top nav + mobile bottom bar + the "Mehr" menu),
buttons, badges, the lion mascot, micro-animations, PWA installability, and
mobile layout rules. The contract for how the app looks and feels.

## Requirements

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

The stylesheet MUST define all color, motif, and theme-specific values as CSS
custom properties under the `--servus-*` namespace, scoped by theme class on the
`<html>` element. Theme-agnostic values (radii, spacing scale, type families,
animation timings) MUST be defined on `:root`. Theme-specific values (palette,
motif strokes, horizon fill, status colors, accents) MUST be redefined inside
each `html.theme-<name>` block. No hard-coded color values MAY appear outside
the token definitions.

Component CSS MUST reference tokens by name only and MUST NOT contain any
theme-name selectors itself (`html.theme-raute .btn-primary { ... }` is
forbidden). The only exceptions are theme-distinct compositional surfaces
explicitly identified in this spec (currently: the login splash panel,
empty-state illustrations, and the page-section section-break motif).

#### Scenario: Structural tokens are defined on :root

- **WHEN** the stylesheet is loaded
- **THEN** CSS custom properties `--servus-radius`, `--servus-radius-pill`,
  `--servus-space-1` through `--servus-space-8`, `--servus-type-display-family`,
  and `--servus-type-body-family` are defined on `:root`

#### Scenario: Theme tokens are defined per theme class

- **WHEN** the stylesheet is loaded
- **THEN** every theme class (`html.theme-raute`, `html.theme-sternenhimmel`)
  defines the same set of theme tokens — `--servus-bg`, `--servus-surface`,
  `--servus-surface-raised`, `--servus-text`, `--servus-text-muted`,
  `--servus-border`, `--servus-primary`, `--servus-primary-hover`,
  `--servus-accent`, `--servus-danger`, `--servus-nav-bg`,
  `--servus-nav-active`, `--servus-motif-stroke`, `--servus-horizon-fill`, and
  `--servus-spark`

#### Scenario: Component CSS contains no theme-name selectors

- **WHEN** any component stylesheet (buttons, badges, item rows, navigation, box
  plaque, quick-add) is inspected
- **THEN** no rule contains `html.theme-raute` or `html.theme-sternenhimmel` as
  a selector — the only token-source is the cascading custom property

---

### Requirement: Bavarian color palette

The light theme `html.theme-raute` MUST use the Raute (Bavarian flag) palette
with the following token values. Body-text contrast on the page ground MUST meet
WCAG AA (4.5:1 for body, 3:1 for large text).

| Token                     | Raute value |
| ------------------------- | ----------- |
| `--servus-bg`             | `#F4ECDA`   |
| `--servus-surface`        | `#FFFFFF`   |
| `--servus-surface-raised` | `#FAF5E8`   |
| `--servus-text`           | `#0A1A2E`   |
| `--servus-text-muted`     | `#7B8B9E`   |
| `--servus-border`         | `#D5C9A8`   |
| `--servus-primary`        | `#0E4FA0`   |
| `--servus-primary-hover`  | `#093C7C`   |
| `--servus-accent`         | `#E5A82E`   |
| `--servus-danger`         | `#B4332D`   |
| `--servus-nav-bg`         | `#0E4FA0`   |
| `--servus-nav-active`     | `#E5A82E`   |
| `--servus-motif-stroke`   | `#FFFFFF`   |
| `--servus-horizon-fill`   | `#FFFFFF`   |
| `--servus-spark`          | `#E5A82E`   |

#### Scenario: Primary action uses Bayernblau

- **WHEN** an element using `--servus-primary` is rendered under
  `html.theme-raute`
- **THEN** the computed background colour resolves to `#0E4FA0`

#### Scenario: Page ground is parchment

- **WHEN** the body is rendered under `html.theme-raute`
- **THEN** the computed `background-color` is `#F4ECDA`

#### Scenario: Body text on parchment passes WCAG AA

- **WHEN** body text is rendered on the parchment ground in `html.theme-raute`
- **THEN** the contrast ratio between text and ground is at least 4.5:1

---

### Requirement: Named themes via user toggle and system preference

The app MUST support a user-controlled theme switch between `theme-raute`
(light, Bavarian day) and `theme-sternenhimmel` (dark, alpine starry sky). The
active theme MUST be persisted in `localStorage` under the key `servus-theme`
with values `"raute"` or `"sternenhimmel"`. The token value SHOULD be a theme
name, not a mode name (light/dark), so that adding a third theme later does not
require a value migration.

When no stored preference exists, the app MUST respect the device's
`prefers-color-scheme` media query as the default: `dark` resolves to
`theme-sternenhimmel`, otherwise `theme-raute`. The system preference MUST
remain live (the default value MUST NOT be written to `localStorage`) until the
user explicitly toggles.

The active theme MUST be applied by setting `html.theme-<name>` on the document
element. Exactly one `html.theme-*` class is present at any time.

An inline synchronous `<script>` in `<head>`, before any stylesheet `<link>`,
MUST read `localStorage`, validate the value is one of the known theme names,
and apply the appropriate class to `<html>` before first paint. Invalid or
absent values MUST fall through to the system-preference path, and as a final
safety MUST default to `theme-raute`.

A toggle control MUST be present in the top navigation bar on viewports ≥ 768 px
and in the mobile FAB position on viewports < 768 px. Both controls MUST be
reachable on every page, regardless of authentication state.

The `<meta name="theme-color">` content MUST match the active theme: `#0E4FA0`
for Raute, `#0E1830` for Sternenhimmel.

The dark theme `html.theme-sternenhimmel` MUST use the Sternenhimmel (alpine
starry sky) palette with the following token values:

| Token                     | Sternenhimmel value |
| ------------------------- | ------------------- |
| `--servus-bg`             | `#0E1830`           |
| `--servus-surface`        | `#161A23`           |
| `--servus-surface-raised` | `#1C2230`           |
| `--servus-text`           | `#C5CFDC`           |
| `--servus-text-muted`     | `#8C97A9`           |
| `--servus-border`         | `#1A2942`           |
| `--servus-primary`        | `#F0D87A`           |
| `--servus-primary-hover`  | `#C9B452`           |
| `--servus-accent`         | `#F0D87A`           |
| `--servus-danger`         | `#B85050`           |
| `--servus-nav-bg`         | `#060C1A`           |
| `--servus-nav-active`     | `#F0D87A`           |
| `--servus-motif-stroke`   | `#2D5F8C`           |
| `--servus-horizon-fill`   | `#1A2942`           |
| `--servus-spark`          | `#D9772B`           |

#### Scenario: User can toggle theme from the UI

- **WHEN** an authenticated user clicks the theme toggle control
- **THEN** the `html` element's class swaps between `theme-raute` and
  `theme-sternenhimmel` immediately without a page reload, and the visual
  treatment of the page updates within the same animation frame

#### Scenario: Theme preference persists across sessions

- **WHEN** a user sets `theme-sternenhimmel` and closes and reopens the app
- **THEN** the app loads under `theme-sternenhimmel` without further input

#### Scenario: System preference applies on first visit only

- **WHEN** a user visits the app for the first time with no stored preference
  and their OS is configured for dark mode
- **THEN** the app renders under `theme-sternenhimmel` AND
  `localStorage["servus-theme"]` remains absent

#### Scenario: Toggle writes localStorage

- **WHEN** a user explicitly toggles the theme
- **THEN** `localStorage["servus-theme"]` is set to the new theme name and any
  subsequent reload uses the stored value

#### Scenario: Invalid stored value falls through

- **WHEN** the app loads with `localStorage["servus-theme"]` containing any
  value other than `"raute"` or `"sternenhimmel"` (e.g., the legacy `"dark"`
  string)
- **THEN** the pre-paint script ignores the value and resolves the theme via the
  system-preference path

#### Scenario: No flash of wrong theme on load

- **WHEN** a returning user with stored `theme-sternenhimmel` loads any page
- **THEN** the page renders immediately under `theme-sternenhimmel` and no
  Raute-colored ground or surface is visible at any point during page load

#### Scenario: theme-color meta matches active theme

- **WHEN** `theme-sternenhimmel` is active
- **THEN** the `<meta name="theme-color">` content attribute equals `#0E1830`,
  and after toggling to `theme-raute` the attribute equals `#0E4FA0`

---

### Requirement: Button class variants

The stylesheet MUST define the following button classes, each with hover,
focus-visible, and active states. Every variant MUST read its colors from tokens
so it renders correctly under both themes without per-theme selectors.

- `.btn-primary` — primary token background, surface-contrast text (Raute: white
  on Bayernblau; Sternenhimmel: midnight on Sterngold)
- `.btn-secondary` — transparent background, primary token border, primary token
  text
- `.btn-danger` — danger token background, surface-contrast text
- `.btn-small` — reduced padding and font-size modifier, combinable with any of
  the above

Corner radius MUST use `--servus-radius` (2 px) — no friendly rounding. Focus
rings MUST use the accent token with 3 px outline offset for visibility on both
themes.

#### Scenario: `.btn-primary` adapts across themes

- **WHEN** a `.btn-primary` button is rendered under `theme-raute`
- **THEN** its background resolves to `#0E4FA0` and text to white
- **WHEN** the same button is rendered under `theme-sternenhimmel`
- **THEN** its background resolves to `#F0D87A` and text to `#0E1830`

#### Scenario: `.btn-danger` renders danger color

- **WHEN** a `.btn-danger` button is rendered
- **THEN** its background uses the `--servus-danger` token value of the active
  theme

#### Scenario: `.btn-small` reduces size

- **WHEN** a `.btn-small` button is rendered alongside a standard button
- **THEN** it is visibly smaller in both padding and font-size

#### Scenario: Focus-visible is visible under both themes

- **WHEN** any `.btn-*` button is focused via keyboard under either theme
- **THEN** an accent-coloured outline ring is rendered with at least 3 px offset
  and visible contrast against the surrounding surface

---

### Requirement: Box status badges

Box status values MUST be rendered as token-driven badge chips. Color MUST
convey status at a glance without relying on text alone, and MUST adapt across
both themes:

- `empty` → muted text token on transparent background
- `packed` → primary token (Bayernblau in Raute, Sterngold in Sternenhimmel)
- `delivered` → forest green in Raute (`#3D8B5C`), almgrün-nacht in
  Sternenhimmel (`#5A7848`)
- `pending` → accent gold in Raute, Fensterlicht orange in Sternenhimmel

Each badge MUST have a leading shape indicator (small disc or lozenge) so
colour-blind users can distinguish status by shape as well as colour.

#### Scenario: Packed badge uses primary token

- **WHEN** a packed box is rendered under either theme
- **THEN** the badge background uses the active theme's `--servus-primary` token

#### Scenario: Delivered badge is distinct green

- **WHEN** a delivered box is rendered
- **THEN** the badge background is a green visibly distinct from the packed
  badge under both themes

#### Scenario: Badge carries a shape indicator

- **WHEN** any status badge is rendered
- **THEN** the badge includes a leading disc, lozenge, or other geometric marker
  before the status text, so the status is identifiable without colour

---

### Requirement: Bottom navigation bar

When a user is authenticated the app MUST render a bottom navigation bar visible
on viewports narrower than 768 px. The bar MUST contain links to Items and
Boxes, the Quick-add action, and a "Mehr" (More) link to the secondary menu.
Secondary destinations (Categories, Rooms, administration, logout, theme) MUST
NOT appear directly in the bottom bar; they are reached through the Mehr menu. A
top navigation bar MUST be shown instead on viewports 768 px and wider.

#### Scenario: Bottom nav visible on narrow viewport

- **WHEN** an authenticated user views the app on a viewport narrower than 768
  px
- **THEN** a `nav.bottom-nav` element is visible at the bottom of the screen

#### Scenario: Top nav visible on wide viewport

- **WHEN** an authenticated user views the app on a viewport 768 px or wider
- **THEN** a `nav.top-nav` element is visible and `nav.bottom-nav` is hidden

#### Scenario: Bottom nav contains the primary entries plus Mehr

- **WHEN** the bottom nav is rendered
- **THEN** it contains links to `/items` and `/boxes`, the Quick-add action, and
  a link to the Mehr menu (`/mehr`)

#### Scenario: Bottom nav excludes secondary destinations

- **WHEN** the bottom nav is rendered
- **THEN** it does not contain direct links to `/categories` or `/rooms`, and it
  does not contain the logout form

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
name, a theme color matching the Raute primary (`#0E4FA0`), and at least one
icon. Apple-specific `<meta>` tags for `apple-mobile-web-app-capable` and
`apple-mobile-web-app-status-bar-style` MUST be present in `<head>`.

The runtime `<meta name="theme-color">` MUST be dynamically updated to match the
active theme (overriding the manifest value while the app is open) so the
iOS/Android browser chrome blends with the page.

#### Scenario: Manifest link present in HTML

- **WHEN** any page of the app is loaded
- **THEN** the HTML `<head>` contains
  `<link rel="manifest" href="/manifest.json">`

#### Scenario: Manifest is valid JSON

- **WHEN** a browser requests `/manifest.json`
- **THEN** the response is valid JSON with `name`, `short_name`, `display`,
  `theme_color`, and `icons` fields, and `theme_color` equals `#0E4FA0`

#### Scenario: Runtime theme-color matches active theme

- **WHEN** a user toggles between themes
- **THEN** the `<meta name="theme-color">` content updates to `#0E4FA0` for
  Raute or `#0E1830` for Sternenhimmel without a reload

#### Scenario: App installable on mobile

- **WHEN** an authenticated user visits the app on a mobile browser that
  supports PWA installation
- **THEN** the browser presents an "Add to Home Screen" prompt or install option

---

### Requirement: Active navigation indicator

The currently active navigation section MUST be visually indicated in both the
top navigation bar and the bottom navigation bar. Active state is determined by
matching the current page path against each nav link's `href` using prefix
matching (e.g., `/items/abc` matches the Items link). The indicator MUST use the
`--servus-nav-active` token.

The indicator treatment MUST be appropriate to each theme:

- Under `theme-raute`, the active link MUST display a filled gold lozenge behind
  the label in the top nav, and a 2 px gold top border with full opacity in the
  bottom nav.
- Under `theme-sternenhimmel`, the active link MUST display a 2 px gold bottom
  border in the top nav (the "gold horizon" treatment) and a 2 px gold top
  border with full opacity in the bottom nav.

Both treatments MUST be reachable by token + class combinations only — no inline
styles, no JS-driven theme branches.

#### Scenario: Active link highlighted under Raute

- **WHEN** an authenticated user is on any page under `/items` with
  `theme-raute` active
- **THEN** the Items link in the top navigation displays a gold lozenge
  treatment using `--servus-nav-active`

#### Scenario: Active link highlighted under Sternenhimmel

- **WHEN** an authenticated user is on any page under `/items` with
  `theme-sternenhimmel` active
- **THEN** the Items link in the top navigation displays a 2 px gold bottom
  border using `--servus-nav-active`

#### Scenario: Active item highlighted in bottom nav

- **WHEN** an authenticated user is on any page under `/boxes` under either
  theme
- **THEN** the Boxes item in the bottom navigation displays a 2 px gold top
  border (`--servus-nav-active`) and full opacity

---

### Requirement: Quick-add visual distinction in bottom nav

The bottom-nav quick-add item (linking to `/items/quick-add`) MUST be visually
distinct from the other items so it reads as the primary action. It MUST be
implemented as a raised circular button that sits above the nav baseline.

The visual treatment MUST adapt across themes:

- Under `theme-raute`, the button background MUST be `--servus-primary`
  (Bayernblau) with the icon in `--servus-accent` (Löwengold), and the outer
  ring MUST be `--servus-nav-bg`.
- Under `theme-sternenhimmel`, the button background MUST be `--servus-primary`
  (Sterngold) with the icon in `--servus-nav-bg` (midnight), and a soft gold
  glow MUST be applied via `box-shadow`.

#### Scenario: Quick-add button is the primary action on mobile

- **WHEN** the bottom navigation is rendered on a viewport < 768 px under either
  theme
- **THEN** the quick-add item is visibly the largest, highest-contrast
  interactive element in the bottom nav

#### Scenario: Quick-add uses primary token

- **WHEN** the bottom nav is rendered
- **THEN** the quick-add button background uses the active theme's
  `--servus-primary` token

---

### Requirement: Desktop layout width

On viewports ≥ 768 px, the `.page` container MUST have a maximum width of
`960px`, centered horizontally. On narrower viewports, `.page` fills the
available width with horizontal padding only.

#### Scenario: Desktop page is 960 px wide

- **WHEN** an authenticated user views any page on a viewport wider than 960 px
- **THEN** the page content is centered in a 960 px column, not a 720 px column

---

### Requirement: Mobile touch target minimum

Interactive controls within list rows MUST have a minimum touch target height of
44 px on viewports < 768 px to meet iOS Human Interface Guidelines. This applies
to the quantity increment and decrement buttons.

#### Scenario: Quantity buttons meet 44 px minimum on mobile

- **WHEN** an authenticated user views the items list on a viewport narrower
  than 768 px
- **THEN** the quantity increment and decrement buttons each have a rendered
  height of at least 44 px

---

### Requirement: Mobile item card layout

Each item in the item list MUST use a three-zone layout:
`[thumbnail?] | [body] | [quantity controls]`. The three zones MUST NOT wrap
(`flex-wrap: nowrap`). The body zone MUST display the item name (with
`text-overflow: ellipsis` truncation) and optional status badge on a first line
(`.item-row-top`), and the category · room meta text on a second line below it.
On viewports ≥ 768 px the body zone MUST switch to `flex-direction: row` so that
name, badge, and meta are displayed on a single horizontal line, preserving the
desktop density of the current layout.

#### Scenario: Item row does not overflow on a narrow viewport

- **GIVEN** the items list contains at least one item with a long name and one
  item in pending status
- **WHEN** an authenticated user views `/items` on a 375 px wide viewport
- **THEN** each `.item-row` is rendered in at most two visible lines (name line
  and meta line); no content overlaps or is clipped by the viewport edge
- **AND** the quantity controls are right-aligned and vertically centred

#### Scenario: Desktop row remains single-line

- **WHEN** an authenticated user views `/items` on a viewport ≥ 768 px
- **THEN** each item row displays name, badge (if applicable), and meta text on
  a single horizontal line alongside the quantity controls

### Requirement: Secondary navigation menu ("Mehr")

The app MUST provide a server-rendered secondary navigation page at `/mehr`,
reachable from the bottom navigation's "Mehr" entry, for authenticated users.
The page MUST list the secondary destinations — Categories, Rooms, and
administration — and MUST provide the logout action as a CSRF-protected POST
form and access to the theme (Design) control. The page MUST be reachable
without client-side JavaScript (no island/bottom-sheet dependency). All labels
MUST be rendered through the i18n helper.

#### Scenario: Mehr page lists secondary destinations

- **WHEN** an authenticated user opens `/mehr`
- **THEN** the page shows links to `/categories` and `/rooms` and the
  administration area

#### Scenario: Logout works from the Mehr page

- **WHEN** an authenticated user submits the logout form on `/mehr`
- **THEN** the session is ended and the user is returned to the logged-out state

#### Scenario: Mehr page requires authentication

- **WHEN** an unauthenticated client requests `/mehr`
- **THEN** it is redirected to login rather than shown the menu

---

### Requirement: Consistent empty states

Every list page MUST use the shared `EmptyState` component (icon + message) when
no records exist. Ad-hoc empty paragraphs or divs are not permitted.

#### Scenario: Empty list shows EmptyState

- **WHEN** an authenticated user visits any list page (items, boxes, rooms,
  categories, groups) and the list is empty
- **THEN** the `EmptyState` component is rendered with the lion SVG and a German
  prompt

---

### Requirement: Correct German pluralization

Count strings (item counts, box counts) MUST use the
`count(n, singular, plural)` helper and produce grammatically correct German for
both n=1 and n≠1.

#### Scenario: Singular item count

- **WHEN** exactly 1 item or box is counted
- **THEN** the display reads "1 Gegenstand" / "1 Karton" (not "1 Gegenstände")

---

### Requirement: Consistent secondary-action styling

All Zurück and Abbrechen links/buttons MUST use the `.btn-secondary` class.

---

### Requirement: BottomNav exact active-tab matching

The active tab indicator in the bottom navigation MUST fire only when the
current path equals the tab's href exactly or starts with `href + "/"`. It MUST
NOT fire for unrelated sibling paths that happen to share a prefix.

#### Scenario: /items tab active on sub-routes

- **WHEN** the current path is `/items/123` or `/items/incomplete`
- **THEN** the Items tab is marked active

#### Scenario: /items tab not active on /items-related-but-different path

- **WHEN** the current path is a route that does not start with `/items/` and is
  not `/items`
- **THEN** the Items tab is NOT marked active

---

### Requirement: Raute lozenge motif

The light theme MUST use the Bavarian Raute (lozenge) as a recurring structural
motif, not as decoration. The motif MUST appear at three specific surfaces:

- The login splash panel (one half of the split layout) MUST render a faint
  diagonal lozenge pattern using `--servus-motif-stroke` against
  `--servus-nav-bg`.
- Section breaks on long pages (between page header and content, between major
  content blocks) MUST be a thin gold-on-parchment lozenge band using
  `--servus-nav-active` over `--servus-bg`.
- The top-nav active indicator MUST use a single filled gold lozenge as defined
  under "Active navigation indicator".

The motif implementation MUST be a single inline SVG pattern reusable across all
three surfaces, parameterised by a `currentColor` fill and a token-driven stroke
colour.

#### Scenario: Login splash shows lozenge pattern under Raute

- **WHEN** an unauthenticated user visits `/login` with `theme-raute` active
- **THEN** the splash panel renders a faint diagonal lozenge pattern over the
  Bayernblau ground

#### Scenario: Section break renders lozenge band

- **WHEN** a page with a `.section-break` element is rendered under
  `theme-raute`
- **THEN** the section break displays a thin gold lozenge motif

#### Scenario: Lozenge SVG is theme-aware

- **WHEN** the lozenge motif renders under `theme-sternenhimmel`
- **THEN** it uses `--servus-motif-stroke` (muted flag-blue) instead of white,
  so the same SVG reads as the flag motif at night

---

### Requirement: Sternenhimmel night-sky motif

The dark theme MUST use a starry-night-sky motif composed of three elements
visible across the app:

- A faint star scatter pattern as a fixed background layer on the page body,
  using `--servus-spark` (gold) and `--servus-text-muted` (silver-blue) as
  pinpoint colours at low opacity.
- A peak silhouette band that anchors the bottom of major surfaces (login
  splash, page hero, section breaks) using `--servus-horizon-fill`.
- A single `--servus-spark` (Fensterlicht orange) point placed near a peak
  silhouette on the login splash and on the items-list page header — a tiny warm
  hint of a lit window across the valley.

The star pattern MUST NOT be visible under `theme-raute` (the body background
layer is generated only under `theme-sternenhimmel`).

#### Scenario: Star scatter visible under Sternenhimmel

- **WHEN** any authenticated page is loaded with `theme-sternenhimmel` active
- **THEN** a faint star pattern is visible on the body ground, scrolling with
  the viewport, and the same page under `theme-raute` shows no star pattern

#### Scenario: Peak silhouette appears at section breaks

- **WHEN** a page with a `.section-break` element is rendered under
  `theme-sternenhimmel`
- **THEN** the section break displays a peak silhouette band using
  `--servus-horizon-fill`

#### Scenario: Fensterlicht spark is rendered once

- **WHEN** the login splash or items-list page header is rendered under
  `theme-sternenhimmel`
- **THEN** exactly one `--servus-spark`-colored point is visible near the peak
  silhouette as a warm accent

---

### Requirement: Display typography per theme

Each theme MUST use a distinct display typography, applied via the shared token
`--servus-type-display-family`, while body and form copy MUST share a single
neutral family (`Inter`).

- Under `theme-raute`, `--servus-type-display-family` MUST resolve to a DIN
  system stack: `"DIN Alternate", "DIN Pro", "Roboto Condensed", system-ui`. No
  web font is fetched for Raute display type.
- Under `theme-sternenhimmel`, `--servus-type-display-family` MUST resolve to
  `"Roboto Condensed", system-ui`, with the Google Fonts `Roboto Condensed`
  stylesheet loaded with `font-display: swap`.

The Roboto Condensed `<link>` MUST be inserted conditionally — only when
`theme-sternenhimmel` is active at page load, or when the user toggles to
Sternenhimmel during a session. Once loaded in a session the link MAY remain.

Inter MUST be loaded unconditionally on every page.

#### Scenario: DIN stack used under Raute

- **WHEN** a heading is rendered under `theme-raute`
- **THEN** the computed `font-family` chain begins with `DIN Alternate`,
  `DIN Pro`, then `Roboto Condensed`, then `system-ui`

#### Scenario: Roboto Condensed loaded for Sternenhimmel

- **WHEN** a user with no stored preference visits the app on an OS in dark mode
- **THEN** the document fetches the Google Fonts `Roboto Condensed` stylesheet
  before first paint or shortly after, and the visible heading renders in that
  family

#### Scenario: No web font fetched for Raute-only sessions

- **WHEN** a user with `localStorage["servus-theme"] = "raute"` visits the app
- **THEN** no request to Google Fonts for `Roboto Condensed` is made during page
  load

---

### Requirement: Theme extensibility for future themes

The token system MUST allow a third (and any further) theme to be added by
contributing a single `html.theme-<name>` block to the stylesheet plus a single
registration in the `ThemeToggle` island, with no edits to component CSS.
Component CSS MUST NOT enumerate theme names.

`localStorage["servus-theme"]` MUST treat any unknown theme value as absent so a
removed theme degrades gracefully to the system-preference default.

#### Scenario: Component CSS does not enumerate themes

- **WHEN** the component stylesheets are searched for theme names
- **THEN** no occurrence of the literal substrings `theme-raute`,
  `theme-sternenhimmel`, or any future theme name is found in component rules —
  token references only

#### Scenario: Unknown stored theme degrades gracefully

- **WHEN** the app loads with `localStorage["servus-theme"] = "laerchenholz"`
  but `theme-laerchenholz` is not registered in the current build
- **THEN** the pre-paint script ignores the value and falls through to the
  system-preference path

---

### Requirement: Complete CSS class coverage

Every CSS class referenced from existing TSX components MUST have a definition
in the new stylesheet under both themes. In particular, the following classes
MUST be defined and verified:

- `.auth-page` — centered card layout on the login route
- `.photo-gallery`, `.photo-gallery-img` — grid layout for item photo display
- `.qty-controls`, `.qty-label` — flex row container for the quantity island
- `.badge-pending` — pending-status badge variant
- `.photo-capture`, `.photo-capture--multi` — flex column container for the
  photo capture island
- `.capture-btn`, `.capture-error` — capture-button label and error text

The implementation MUST add a unit test that asserts each of these classes
resolves to a non-empty computed style block, preventing future regressions
where a class is referenced but undefined.

#### Scenario: Every referenced class has a definition

- **WHEN** the stylesheet is loaded and a test mounts each component that
  references one of the listed classes
- **THEN** each class produces a non-empty computed style block (at least one
  resolved property)

#### Scenario: Photo capture renders without missing styles

- **WHEN** a user opens `/items/quick-add` on a viewport < 768 px
- **THEN** the `.photo-capture` container renders with the intended flex layout
  and the capture button is visible

#### Scenario: Auth page card is centered

- **WHEN** an unauthenticated user visits `/login`
- **THEN** the `.auth-page` container centers the login card horizontally and
  vertically on viewports of any width
