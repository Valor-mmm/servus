## MODIFIED Requirements

### Requirement: Item list with search and filter

The system MUST provide a list view of items with server-side search by name
(case-insensitive substring) and filter by category and by room. Each item row
MUST display the item's primary photo (`photos[0]`) as a thumbnail when present,
its display name (`(unbenannt)` if `name` is empty and `status` is `"pending"`,
otherwise the name), category, room, and quantity. Items with
`status: "pending"` MUST be visually distinguishable from `confirmed` items.
Each row MUST provide inline `−` and `+` actions to decrement or increment the
quantity by 1.

The default view (no filter params) MUST load only the 50 most recently created
items using `listItemsRecent(50)`. A full load of all items MUST only occur when
`?all=1` is active or when text search is used. Filtering by category or room
MUST use the corresponding secondary index (`listItemsByCategory` or
`listItemsByRoom`) rather than loading all items. All search and filtering MUST
be performed server-side against the complete loaded set; client-side filtering
of a limited result set is forbidden.

#### Scenario: Default view shows 50 most recent items

- **WHEN** an authenticated user visits `/items` with no query parameters and
  more than 50 items exist
- **THEN** exactly 50 items are shown, in descending creation order

#### Scenario: List shows thumbnails for items with photos

- **WHEN** an authenticated user visits `/items` and at least one item has a
  non-empty `photos` array
- **THEN** that item's row renders an `<img>` element whose `src` is a presigned
  GET URL for `photos[0]`

#### Scenario: List shows placeholder name for pending unnamed item

- **WHEN** an authenticated user visits `/items` and at least one item has
  `status: "pending"` and `name: ""`
- **THEN** that item's row shows the placeholder display name `(unbenannt)`

#### Scenario: Pending items are visually distinguishable

- **WHEN** an authenticated user visits `/items` with a mix of `pending` and
  `confirmed` items
- **THEN** pending rows display a status indicator distinct from confirmed rows

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

#### Scenario: Filter by category uses index

- **WHEN** an authenticated user filters by a specific category
- **THEN** only items with that category are shown, loaded via the category
  secondary index

#### Scenario: Filter by room uses index

- **WHEN** an authenticated user filters by a specific room
- **THEN** only items with that room assignment are shown, loaded via the room
  secondary index

#### Scenario: Search by name loads full corpus

- **WHEN** an authenticated user enters a search term
- **THEN** all items are loaded server-side and only those whose name contains
  the term (case-insensitive) are shown

#### Scenario: Combined filter and search

- **WHEN** an authenticated user applies a category filter and a name search
  simultaneously
- **THEN** items are loaded via the category index and filtered server-side by
  the search term; only items matching both conditions are shown

---

### Requirement: KV index consistency

The system MUST maintain category, room, and time indexes atomically with every
item mutation. No mutation MUST leave the indexes in a state inconsistent with
the primary item records.

#### Scenario: Category and room indexes reflect item after create

- **WHEN** an item is created with category C and room R
- **THEN** the item appears in the prefix scan for `["item-by-category", C]` and
  `["item-by-room", R]`

#### Scenario: Time index reflects item after create

- **WHEN** an item is created
- **THEN** a `["item-by-time", createdAt, id]` entry exists in KV

#### Scenario: Category index reflects item after update

- **WHEN** an item's category is changed from C1 to C2
- **THEN** the item no longer appears under `["item-by-category", C1]` and does
  appear under `["item-by-category", C2]`

#### Scenario: All indexes reflect item after delete

- **WHEN** an item is deleted
- **THEN** it no longer appears in any category, room, or time index prefix scan
