# Design System Specification

## MODIFIED Requirements

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

## ADDED Requirements

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
