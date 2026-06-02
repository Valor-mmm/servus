## ADDED Requirements

### Requirement: Time-ordered item index

The system MUST maintain a secondary index `["item-by-time", timestamp, itemId]`
on every item write, where `timestamp` is the `Date.now()` value recorded in the
item's `createdAt` field. The index entry MUST be added atomically with the
primary item record in `createItem()`. The index entry MUST be removed
atomically with the primary record in `deleteItem()`, using the item's stored
`createdAt` value to reconstruct the key.

#### Scenario: Index entry created with item

- **WHEN** an authenticated user creates a new item
- **THEN** a `["item-by-time", createdAt, id]` entry exists in KV with value
  `true`

#### Scenario: Index entry removed with item

- **WHEN** an authenticated user deletes an item
- **THEN** the `["item-by-time", createdAt, id]` entry no longer exists in KV

---

### Requirement: Recent items listing

The system MUST provide a `listItemsRecent(limit: number): Promise<Item[]>`
repository function that returns the most recently created items in
descending creation order (newest first), up to `limit` items. The function
MUST use `kv.list({ prefix: ["item-by-time"], limit, reverse: true })` and
resolve each index entry to a full `Item` record via `findItem()`.

#### Scenario: Returns newest items first

- **WHEN** `listItemsRecent(3)` is called with five items in KV
- **THEN** the three most recently created items are returned, with the newest
  at index `0`

#### Scenario: Respects the limit

- **WHEN** `listItemsRecent(50)` is called with 200 items in KV
- **THEN** exactly 50 items are returned

#### Scenario: Returns all items when count is below limit

- **WHEN** `listItemsRecent(50)` is called with 10 items in KV
- **THEN** all 10 items are returned

---

### Requirement: Item count

The system MUST provide a `countItems(): Promise<number>` repository function
that returns the total number of items in KV. The function MAY use eventual
consistency and MUST NOT fetch item values (key-only scan for efficiency).

#### Scenario: Returns accurate count

- **WHEN** `countItems()` is called with 42 items in KV
- **THEN** the function returns `42`

#### Scenario: Returns zero for empty KV

- **WHEN** `countItems()` is called with no items in KV
- **THEN** the function returns `0`

---

### Requirement: Filter-aware item list route

The system MUST select the most efficient load strategy for `GET /items` based
on the active query parameters, according to the following rules:

| Active params          | Load strategy                              |
| ---------------------- | ------------------------------------------ |
| None                   | `listItemsRecent(50)`                      |
| `?all=1`               | `listItems()` (full load)                  |
| `?cat=X`               | `listItemsByCategory(X)`                   |
| `?room=Y`              | `listItemsByRoom(Y)`                       |
| `?q=text`              | `listItems()` + server-side substring filter |
| `?q=text` + `?cat=X`  | `listItemsByCategory(X)` + server-side substring filter |

Text search MUST always be performed server-side against the full loaded set.
Client-side filtering of a limited result set is explicitly forbidden.

#### Scenario: Default view uses recent listing

- **WHEN** an authenticated user visits `/items` with no query parameters
- **THEN** the route calls `listItemsRecent(50)` and displays at most 50 items

#### Scenario: Category filter uses index

- **WHEN** an authenticated user visits `/items?cat=abc123`
- **THEN** the route calls `listItemsByCategory("abc123")` and displays only
  items in that category

#### Scenario: Room filter uses index

- **WHEN** an authenticated user visits `/items?room=xyz789`
- **THEN** the route calls `listItemsByRoom("xyz789")` and displays only items
  assigned to that room

#### Scenario: Text search loads full corpus

- **WHEN** an authenticated user visits `/items?q=winter`
- **THEN** the route calls `listItems()` (full load) and returns only items
  whose name contains "winter" (case-insensitive)

#### Scenario: Combined category and text search

- **WHEN** an authenticated user visits `/items?cat=abc123&q=winter`
- **THEN** the route calls `listItemsByCategory("abc123")` and applies a
  server-side substring filter for "winter"

#### Scenario: All-param bypasses limit

- **WHEN** an authenticated user visits `/items?all=1`
- **THEN** the route calls `listItems()` and displays all items regardless of
  count

---

### Requirement: Browse limit UI

When the items list is displayed in limited mode (no filter params, no `?all=1`
active), the system MUST:

- Show the count header: `"50 neueste Gegenstände"` plus an approximate total
  from `countItems()`.
- Display a `"Alle Gegenstände laden"` button below the item list that navigates
  to `/items?all=1`.

When `?all=1` is active or any filter is applied, both the count header note
and the "load all" button MUST be hidden.

#### Scenario: Limited view shows count note and load-all button

- **WHEN** an authenticated user visits `/items` with no query parameters and
  more than 50 items exist
- **THEN** the page shows `"50 neueste Gegenstände"` and a
  `"Alle Gegenstände laden"` button

#### Scenario: Load-all hides browse-limit elements

- **WHEN** an authenticated user visits `/items?all=1`
- **THEN** the count note and the "Alle Gegenstände laden" button are not shown

#### Scenario: Category filter hides browse-limit elements

- **WHEN** an authenticated user visits `/items?cat=X`
- **THEN** the count note and the "Alle Gegenstände laden" button are not shown

---

### Requirement: Auto-submit filter dropdowns

Dropdown filter controls for category and room on the items list page MUST
auto-submit the filter form on `change` without requiring the user to press a
separate submit button. An explicit Filtern button MUST NOT be present for these
controls.

Text search MUST require an explicit submit (pressing Enter or a dedicated
search icon button). The Filtern button is removed and replaced by the search
icon button.

#### Scenario: Category dropdown auto-submits

- **WHEN** an authenticated user changes the category dropdown selection
- **THEN** the filter form is submitted and the page reloads with `?cat=X`
  without the user pressing any additional button

#### Scenario: Room dropdown auto-submits

- **WHEN** an authenticated user changes the room dropdown selection
- **THEN** the filter form is submitted and the page reloads with `?room=Y`
  without the user pressing any additional button

#### Scenario: Text search requires explicit submit

- **WHEN** an authenticated user types in the search input
- **THEN** the form is NOT submitted until the user presses Enter or the search
  icon button
