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

### Requirement: Dark mode via user toggle and system preference

The app MUST support a user-controlled dark mode toggle. The active theme MUST
be persisted in `localStorage` under the key `servus-theme` with values `"dark"`
or `"light"`. When no stored preference exists, the app MUST respect the
device's `prefers-color-scheme` media query as the default.

Dark theme tokens MUST be applied by adding the class `dark` to the `<html>`
element. A `@media (prefers-color-scheme: dark)` block MUST also add the `dark`
class to `<html>` when no `localStorage` value is set, so the preference works
without JS interaction on first visit. An inline `<script>` in `<head>`, before
any stylesheet link, MUST read `localStorage` and conditionally set `html.dark`
before first paint to prevent a flash of the wrong theme.

A toggle button (sun/moon icon) MUST be present in the top navigation bar on
viewports ≥ 768 px. On viewports < 768 px, a fixed-position toggle button MUST
be rendered in the top-right corner of the viewport, accessible from any page.

The dark palette MUST use warm Bavarian tones rather than cold gray:

| Token                     | Dark value |
| ------------------------- | ---------- |
| `--servus-bg`             | `#1a1410`  |
| `--servus-surface`        | `#251e18`  |
| `--servus-surface-raised` | `#2e2419`  |
| `--servus-text`           | `#f0e6d4`  |
| `--servus-text-muted`     | `#9d8873`  |
| `--servus-border`         | `#3d2f24`  |
| `--servus-primary`        | `#4a8fd4`  |
| `--servus-accent`         | `#e0a820`  |
| `--servus-nav-bg`         | `#0f0c09`  |
| `--servus-nav-active`     | `#e0a820`  |

#### Scenario: User can toggle dark mode from the UI

- **WHEN** an authenticated user clicks the theme toggle button (desktop top nav
  or mobile FAB)
- **THEN** the app switches between light and dark mode immediately without a
  page reload

#### Scenario: Theme preference persists across sessions

- **WHEN** a user sets dark mode and then closes and reopens the app
- **THEN** the app loads in dark mode without requiring the user to toggle again

#### Scenario: System preference used on first visit

- **WHEN** a user visits the app for the first time with no stored preference
  and their device OS is set to dark mode
- **THEN** the app renders in dark mode

#### Scenario: Dark background uses warm Bavarian tones

- **WHEN** dark mode is active
- **THEN** the page background is `#1a1410` (warm dark oak), not a cold gray

#### Scenario: No flash of wrong theme on load

- **WHEN** a returning user with a stored dark-mode preference loads any page
- **THEN** the page renders immediately in dark mode with no visible flash of
  the light theme

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

The app MUST be installable as a Progressive Web App on Android (Chrome and
Firefox). iOS support is deferred. The HTML document MUST include a
`<link rel="manifest">` pointing to `/manifest.json`. The manifest MUST specify
`display: "standalone"`, a short name, a theme color matching the Bavarian blue
token (`#0E4FA0`), and an `icons` array containing at minimum a 192×192 PNG
(`"purpose": "any"`) and a 512×512 PNG (`"purpose": "any maskable"`). Chrome
requires bitmap icons at these sizes to surface the install prompt; SVG-only
manifests do not satisfy Chrome's installability check. SVG entries MAY be
included as additional entries for browsers that prefer them. A registered
service worker is required by Chrome and Firefox for the install prompt to
appear; the app MUST register one.

The service worker MUST pre-cache the app shell (stylesheet, scripts, SVG icons,
and the offline page) on install. For navigation requests, it MUST use a
network-first strategy and fall back to the cached offline page when the network
is unreachable. It MUST NOT cache API responses or user data.

The offline page MUST display the servus lion, a short Bavarian message, and a
reload button that retries the original URL via `window.location.reload()`.

#### Scenario: Manifest link present in HTML

- **WHEN** any page of the app is loaded
- **THEN** the HTML `<head>` contains
  `<link rel="manifest" href="/manifest.json">`

#### Scenario: Manifest has correct icon entries

- **WHEN** a browser requests `/manifest.json`
- **THEN** the response is valid JSON with `name`, `short_name`, `display`,
  `theme_color`, and `icons` fields; the `icons` array contains a 192×192 PNG
  entry with `"purpose": "any"` and a 512×512 PNG entry with
  `"purpose": "any maskable"`

#### Scenario: App installable on Android

- **WHEN** an authenticated user visits the app on Chrome or Firefox for Android
- **THEN** the browser presents an "Add to Home Screen" prompt or install option

#### Scenario: Offline navigation shows offline page

- **GIVEN** the service worker has been installed and the app shell is cached
- **WHEN** the user navigates to any page while the device has no network
  connection
- **THEN** the browser displays the cached offline page with the servus lion and
  the Bavarian message instead of a browser error

---

### Requirement: Active navigation indicator

The currently active navigation section MUST be visually indicated in both the
top navigation bar and the bottom navigation bar. Active state is determined by
matching the current page path against each nav link's `href` using prefix
matching (e.g., `/items/abc` matches the Items link). The indicator MUST use the
`--servus-nav-active` token (gold).

In the top navigation, the active link MUST display a 2 px gold bottom border.
In the bottom navigation, the active item MUST display a 2 px gold top border
and full opacity (non-active items are at reduced opacity).

#### Scenario: Active link highlighted in top nav

- **WHEN** an authenticated user is on any page under `/items`
- **THEN** the Items link in the top navigation displays the gold active
  indicator

#### Scenario: Active item highlighted in bottom nav

- **WHEN** an authenticated user is on any page under `/boxes`
- **THEN** the Boxes item in the bottom navigation displays the gold top border
  and full opacity

---

### Requirement: Quick-add visual distinction in bottom nav

The quick-add nav item in the bottom navigation MUST be visually distinct from
other nav items to identify it as the primary action. It links to
`/items/quick-add` and MUST display a gold accent pill background behind its
icon.

#### Scenario: Quick-add button is visually distinct

- **WHEN** the bottom navigation is rendered
- **THEN** the quick-add item has a gold pill background behind its icon,
  distinguishing it from the other five nav items

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
