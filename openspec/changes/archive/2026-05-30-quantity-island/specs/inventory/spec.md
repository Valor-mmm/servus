## MODIFIED Requirements

### Requirement: Item list with search and filter

The system MUST provide a list view of all items with server-side search by name
(case-insensitive substring) and filter by category and by room. Each item row
MUST display the item's quantity and MUST provide inline `−` and `+` actions to
decrement or increment the quantity by 1. The quantity MUST NOT be decremented
below `1`; a decrement request when quantity is already `1` MUST be silently
ignored. The `+`/`−` actions MUST update the displayed quantity in-place without
a full-page reload (implemented via the `QuantityControl` island and the
`/api/items/adjust-quantity` endpoint).

#### Scenario: List all items shows quantity

- **WHEN** an authenticated user visits `/items` with no filters
- **THEN** all items are displayed, each showing name, category, room, and
  quantity

#### Scenario: Increment quantity from item list

- **WHEN** an authenticated user presses the `+` button on an item row in the
  item list
- **THEN** the item's quantity is increased by 1 and the updated count is shown
  in the list without a page reload

#### Scenario: Decrement quantity from item list

- **WHEN** an authenticated user presses the `−` button on an item row in the
  item list and the item's quantity is greater than 1
- **THEN** the item's quantity is decreased by 1 and the updated count is shown
  in the list without a page reload

#### Scenario: Decrement at minimum is ignored

- **WHEN** an authenticated user presses the `−` button on an item row whose
  quantity is already `1`
- **THEN** the quantity remains `1` and no error is shown

#### Scenario: Filter by category

- **WHEN** an authenticated user filters by a specific category
- **THEN** only items with that category are shown

#### Scenario: Filter by room

- **WHEN** an authenticated user filters by a specific room
- **THEN** only items with that room assignment are shown

#### Scenario: Search by name

- **WHEN** an authenticated user enters a search term
- **THEN** only items whose name contains the term (case-insensitive) are shown

#### Scenario: Combined filter and search

- **WHEN** an authenticated user applies a category filter and a name search
  simultaneously
- **THEN** only items matching both conditions are shown
