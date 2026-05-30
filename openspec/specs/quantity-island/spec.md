## ADDED Requirements

### Requirement: JSON API for quantity adjustment

The system MUST expose a JSON endpoint at `POST /api/items/adjust-quantity` that
accepts `{ itemId, delta, csrf_token }` and returns `{ quantity }`. The endpoint
MUST require an authenticated session. It MUST validate the CSRF token against
the session (threat: cross-site request forgery). It MUST accept `delta` values
of `1` or `-1` only. The endpoint MUST apply the same floor-at-1 rule as the
full-page form path. It MUST return HTTP 400 for invalid input and HTTP 403 for
missing/invalid CSRF or unauthenticated requests.

#### Scenario: Increment via API

- **WHEN** an authenticated user POSTs `{ itemId, delta: 1, csrf_token }` with a
  valid CSRF token
- **THEN** the system returns HTTP 200 with `{ quantity: <new value> }`

#### Scenario: Decrement via API

- **WHEN** an authenticated user POSTs `{ itemId, delta: -1, csrf_token }` and
  item quantity > 1
- **THEN** the system returns HTTP 200 with `{ quantity: <decremented value> }`

#### Scenario: Decrement at floor via API

- **WHEN** an authenticated user POSTs `{ itemId, delta: -1, csrf_token }` and
  item quantity is 1
- **THEN** the system returns HTTP 200 with `{ quantity: 1 }` (no change, no
  error)

#### Scenario: Missing CSRF token is rejected

- **WHEN** a request is made to `POST /api/items/adjust-quantity` without a
  valid CSRF token
- **THEN** the system returns HTTP 403 (threat: CSRF forgery from another
  origin)

#### Scenario: Unauthenticated request is rejected

- **WHEN** a request is made to `POST /api/items/adjust-quantity` without a
  valid session cookie
- **THEN** the system returns HTTP 403

#### Scenario: Invalid delta is rejected

- **WHEN** a request is made with `delta` not equal to `1` or `-1`
- **THEN** the system returns HTTP 400

### Requirement: Client-side quantity control island

The system MUST render `+`/`−` quantity controls as a Fresh 2 island component
(`QuantityControl`) that calls the JSON API and updates the displayed quantity
counter without a full-page reload. The island MUST show the correct quantity on
initial server render (SSR). While a request is in-flight, the buttons MUST be
disabled to prevent double-submit. If the fetch fails, the displayed quantity
MUST revert to its pre-click value. The island MUST accept a `readonly` prop;
when `true`, it MUST render only the `×N` label with no buttons.

#### Scenario: Increment without page reload

- **WHEN** an authenticated user clicks the `+` button in the island
- **THEN** the quantity counter increments immediately and the page does not
  navigate

#### Scenario: Decrement without page reload

- **WHEN** an authenticated user clicks the `−` button in the island
- **THEN** the quantity counter decrements immediately (floor 1) and the page
  does not navigate

#### Scenario: Buttons disabled during request

- **WHEN** a fetch request to the adjust-quantity API is in-flight
- **THEN** both `+` and `−` buttons are disabled until the response is received

#### Scenario: Read-only mode shows no buttons

- **WHEN** the island is rendered with `readonly={true}` (e.g. delivered box)
- **THEN** only the `×N` quantity label is shown; no `+` or `−` buttons are
  present
