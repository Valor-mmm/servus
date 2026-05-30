## ADDED Requirements

### Requirement: Category management

The system MUST provide a flat, admin-managed list of categories used to
classify items. Categories have a unique name and a generated ID. A category
MUST NOT be deleted while any item references it.

#### Scenario: Create a category

- **WHEN** an authenticated user POSTs a non-empty category name to
  `/categories`
- **THEN** a new category record is created and appears in the category list

#### Scenario: Duplicate category name is rejected

- **WHEN** an authenticated user creates a category with a name that already
  exists (case-insensitive)
- **THEN** the system returns a validation error and no record is created

#### Scenario: Delete a referenced category is rejected

- **WHEN** an authenticated user attempts to delete a category that is assigned
  to one or more items
- **THEN** the system returns an error and the category is not deleted

#### Scenario: Delete an unused category

- **WHEN** an authenticated user deletes a category with no items assigned to it
- **THEN** the category record is removed and no longer appears in the list

### Requirement: Room management

The system MUST provide a flat, admin-managed list of destination rooms. Rooms
have a unique name and a generated ID. A room MUST NOT be deleted while any item
references it directly (items assigned via a box are not affected by room
deletion).

#### Scenario: Create a room

- **WHEN** an authenticated user POSTs a non-empty room name to `/rooms`
- **THEN** a new room record is created and appears in the room list

#### Scenario: Duplicate room name is rejected

- **WHEN** an authenticated user creates a room with a name that already exists
  (case-insensitive)
- **THEN** the system returns a validation error and no record is created

#### Scenario: Delete a room directly assigned to an item is rejected

- **WHEN** an authenticated user attempts to delete a room that has items with a
  direct `roomId` pointing to it
- **THEN** the system returns an error and the room is not deleted

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

### Requirement: Item deletion

The system MUST allow authenticated users to delete an item. Deletion MUST
atomically remove the primary record and all index entries.

#### Scenario: Delete an item

- **WHEN** an authenticated user deletes an item
- **THEN** the item record and all index entries for that item are removed and
  the item no longer appears in any list or filter view

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

### Requirement: KV index consistency

The system MUST maintain category and room indexes atomically with every item
mutation. No mutation MUST leave the indexes in a state inconsistent with the
primary item records.

#### Scenario: Index reflects item after create

- **WHEN** an item is created with category C and room R
- **THEN** the item appears in the prefix scan for `["item-by-category", C]` and
  `["item-by-room", R]`

#### Scenario: Index reflects item after update

- **WHEN** an item's category is changed from C1 to C2
- **THEN** the item no longer appears under `["item-by-category", C1]` and does
  appear under `["item-by-category", C2]`

#### Scenario: Index reflects item after delete

- **WHEN** an item is deleted
- **THEN** it no longer appears in any category or room index prefix scan
