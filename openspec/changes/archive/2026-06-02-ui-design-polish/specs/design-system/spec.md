## MODIFIED Requirements

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

## ADDED Requirements

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

The quick-add nav item (linking to `/items/quick-add`) in the bottom navigation
MUST be visually distinct from other nav items to identify it as the primary
action. It MUST display a gold accent pill background behind its icon.

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

Interactive controls within list rows (quantity increment and decrement buttons)
MUST have a minimum touch target height of 44 px on viewports < 768 px to meet
iOS Human Interface Guidelines.

#### Scenario: Quantity buttons meet 44 px minimum on mobile

- **WHEN** an authenticated user views the items list on a viewport narrower
  than 768 px
- **THEN** the quantity increment and decrement buttons each have a rendered
  height of at least 44 px
