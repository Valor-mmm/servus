## ADDED Requirements

### Requirement: Item quantity field

Every `Item` record MUST have a `quantity` field: a positive integer with a
minimum value of `1`. The field MUST default to `1` when not supplied. A
`quantity` value below `1` MUST NOT be accepted by any create or edit operation.
Records persisted before this field was introduced MUST be read back as
`quantity: 1` (coerced at read time in the repository layer).

#### Scenario: Create item with default quantity

- **WHEN** an authenticated user submits a new item form without specifying a
  quantity
- **THEN** the item record is created with `quantity: 1`

#### Scenario: Create item with explicit quantity

- **WHEN** an authenticated user submits a new item form with `quantity: 6`
- **THEN** the item record is created with `quantity: 6`

#### Scenario: Quantity below 1 is rejected on create

- **WHEN** an authenticated user submits a new item form with `quantity: 0`
- **THEN** the system returns a validation error and no record is created

#### Scenario: Quantity below 1 is rejected on edit

- **WHEN** an authenticated user submits an item edit form with `quantity: 0`
- **THEN** the system returns a validation error and the item record is not
  updated

#### Scenario: Quantity can be updated

- **WHEN** an authenticated user edits an item and changes `quantity` from `1`
  to `12`
- **THEN** the item record is saved with `quantity: 12`

#### Scenario: Legacy record without quantity field reads as quantity 1

- **WHEN** an item record exists in KV without a `quantity` field
  (pre-migration)
- **THEN** `findItem` and `listItems` return that item with `quantity: 1`

## MODIFIED Requirements

### Requirement: Item creation

The system MUST allow authenticated users to create items with a name, category,
optional room assignment, optional box assignment, optional estimated value, and
a quantity (positive integer, default `1`). On creation the system MUST set
`status` to `"confirmed"` and `photoKey` to `null`.

#### Scenario: Create an item with required fields

- **WHEN** an authenticated user submits a new item form with a non-empty name
  and a valid category (no quantity specified)
- **THEN** an item record is created with `status: "confirmed"`,
  `photoKey: null`, `quantity: 1`, and timestamps set to the current time

#### Scenario: Create an item with all optional fields

- **WHEN** an authenticated user submits a new item with name, category, room,
  estimated value, and `quantity: 4`
- **THEN** the item record contains all provided values including `quantity: 4`
  and appears in the item list

#### Scenario: Item name is required

- **WHEN** an authenticated user submits a new item form with an empty name
- **THEN** the system returns a validation error and no record is created

### Requirement: Item editing

The system MUST allow authenticated users to edit an item's name, category, room
assignment, estimated value, and quantity. Index entries MUST be updated
atomically with the primary record.

#### Scenario: Change an item's category

- **WHEN** an authenticated user changes an item's category from A to B
- **THEN** the item no longer appears under category A's index and appears under
  category B's index

#### Scenario: Change an item's room

- **WHEN** an authenticated user changes an item's room from X to Y
- **THEN** the item no longer appears under room X's index and appears under
  room Y's index

#### Scenario: Remove an item's room assignment

- **WHEN** an authenticated user clears the room field on an item
- **THEN** `item.roomId` is `null` and the item no longer appears in any room
  index

#### Scenario: Change an item's quantity

- **WHEN** an authenticated user changes an item's quantity
- **THEN** the updated quantity is persisted and shown in the item list and box
  detail

### Requirement: Item list with search and filter

The system MUST provide a list view of all items with server-side search by name
(case-insensitive substring) and filter by category and by room. Each item row
MUST display the item's quantity.

#### Scenario: List all items shows quantity

- **WHEN** an authenticated user visits `/items` with no filters
- **THEN** all items are displayed, each showing name, category, room, and
  quantity

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

### Requirement: Box detail view

The system MUST provide a detail page for each box showing its short code,
label, destination room, status, and the list of items currently assigned to it.
Each item row MUST display the item's quantity and have a remove (unbox) action
when the box is not in `"delivered"` state.

#### Scenario: View box contents shows item quantity

- **WHEN** an authenticated user visits `/boxes/:id`
- **THEN** the page shows all items assigned to the box, each row displaying the
  item's name, category, and quantity
