## ADDED Requirements

### Requirement: Dashboard home page

The home route (`/`) for authenticated users MUST display a live summary
dashboard instead of a static page.

#### Scenario: Dashboard shows live item and box counts

- **WHEN** an authenticated user visits `/`
- **THEN** the page displays total item count, count of incomplete items (linked
  to `/items/incomplete`), and the ratio of packed boxes to total boxes

#### Scenario: Dashboard shows recent items

- **WHEN** an authenticated user visits `/`
- **THEN** the page shows up to 5 most recently added items with their names
  and thumbnails (if available)

#### Scenario: Dashboard has primary Erfassen CTA

- **WHEN** an authenticated user visits `/`
- **THEN** a prominent "Erfassen" button or link is visible that navigates to
  the item capture flow

#### Scenario: Dashboard empty state

- **WHEN** an authenticated user visits `/` and no items exist yet
- **THEN** the dashboard shows an empty state prompt instead of zero-count tiles
