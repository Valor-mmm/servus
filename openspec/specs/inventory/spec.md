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

### Requirement: Item photos collection

Every `Item` record MUST have a `photos` field of type `string[]`: an ordered
list of R2 object keys. The first element (`photos[0]`) is the primary / cover
photo displayed in list and box-detail thumbnails. The default value when no
photos are present MUST be `[]`. Records persisted before this field was
introduced MUST be read back as `photos: []` (coerced at read time).

#### Scenario: New item without photos has empty list

- **WHEN** an authenticated user creates an item through the standard edit form
  without uploading any photo
- **THEN** the persisted record has `photos: []`

#### Scenario: Appended photo lands at the end of the list

- **WHEN** an authenticated user adds a second photo to an item that already has
  one
- **THEN** the persisted record's `photos` array contains the original key at
  index `0` and the new key at index `1`

#### Scenario: Removing the first photo promotes the next

- **WHEN** an authenticated user removes `photos[0]` from an item with three
  photos `[A, B, C]`
- **THEN** the persisted record has `photos: [B, C]` and the list/detail views
  display `B` as the cover

#### Scenario: Legacy record without photos field reads as empty list

- **WHEN** an item record exists in KV without a `photos` field (pre-migration)
- **THEN** `findItem` and `listItems` return that item with `photos: []`

---

### Requirement: Photo-first item creation

The system MUST provide a `POST /api/items/create-from-photo` endpoint that,
given a previously uploaded R2 photo key and an optional `boxId`, creates a new
item with `name: ""`, `categoryId: null`, `photos: [<key>]`,
`status:
"pending"`, `quantity: 1`, and `estimatedValue: null`. The endpoint
MUST require an authenticated session and a valid CSRF token.

#### Scenario: Create item from photo with no box

- **WHEN** an authenticated user POSTs to `/api/items/create-from-photo` with a
  valid photo key and no `boxId`
- **THEN** an item record is created with empty name, null category,
  `quantity:
  1`, `photos: [<key>]`, `status: "pending"`, and appears in the
  item list and in the pending list

#### Scenario: Create item from photo into a box

- **WHEN** an authenticated user POSTs to `/api/items/create-from-photo` with a
  valid photo key and `boxId: "B"`
- **THEN** an item record is created with `boxId: "B"`, `roomId: null`,
  `photos: [<key>]`, `status: "pending"`, and the box's status auto-tracks to
  `"packed"` if it was previously `"empty"`

#### Scenario: Create-from-photo requires authentication

- **WHEN** an unauthenticated client POSTs to `/api/items/create-from-photo`
- **THEN** the response is `401` and no item is created

---

### Requirement: Append photo to existing item

The system MUST provide a `POST /api/items/append-photo` endpoint that appends a
previously uploaded R2 photo key to an existing item's `photos` array. The
endpoint MUST require an authenticated session and a valid CSRF token. Status
MUST NOT change.

#### Scenario: Append photo to confirmed item

- **WHEN** an authenticated user appends a new photo to a `confirmed` item that
  already has one photo
- **THEN** the item's `photos` array has two elements; `status` remains
  `"confirmed"`

#### Scenario: Append photo to pending item

- **WHEN** an authenticated user appends a new photo to a `pending` item
- **THEN** the item's `photos` array grows by one and `status` remains
  `"pending"`

---

### Requirement: Remove photo from item

The system MUST allow authenticated users to remove a single photo from an
item's `photos` array. The removed R2 object MUST be deleted via a best-effort
delete. Status MUST NOT change as a consequence of removing a photo.

#### Scenario: Remove a non-primary photo

- **WHEN** an authenticated user removes `photos[1]` from an item with three
  photos
- **THEN** the persisted `photos` array has two elements and a best-effort R2
  DELETE is issued for the removed key

#### Scenario: Remove the only photo of a pending item

- **WHEN** an authenticated user removes the only photo from a `pending` item
- **THEN** the persisted `photos` array is empty and `status` remains
  `"pending"`

---

### Requirement: Pending status for photo-first items

Items created through `/api/items/create-from-photo` MUST have
`status:
"pending"`. Pending items MUST remain in `pending` state regardless of
edits to name, category, room, box, quantity, or photos made in the standard
edit form. While pending, an item behaves identically to a `confirmed` item for
box assignment, room assignment, quantity actions, and inclusion in lists.

#### Scenario: Pending item with name remains pending

- **WHEN** an authenticated user edits a `pending` item and gives it a name
- **THEN** the persisted record has the new name and `status: "pending"`

#### Scenario: Pending item counts toward box packed status

- **WHEN** a photo-first capture creates a `pending` item assigned to an empty
  box
- **THEN** the box's status auto-transitions from `"empty"` to `"packed"`

---

### Requirement: Pending-items triage list

The system MUST provide a route `/items/pending` that lists all items with
`status: "pending"`, ordered by creation time (newest first). Each row MUST show
the item's primary photo as a thumbnail, the display name (`(unbenannt)` if
`name` is empty), the box assignment if any, the quantity, and a link to edit.

#### Scenario: Pending list shows only pending items

- **WHEN** an authenticated user visits `/items/pending` with five items in the
  system (three `pending`, two `confirmed`)
- **THEN** exactly three item rows are shown

#### Scenario: Pending list ordering

- **WHEN** an authenticated user visits `/items/pending` with multiple pending
  items
- **THEN** rows appear with the most recently created item first

---

### Requirement: Item creation

The system MUST allow authenticated users to create items through the standard
create form with a name, category, optional room assignment, optional box
assignment, optional estimated value, and a quantity (positive integer, default
`1`). On creation through the standard form the system MUST set `status` to
`"confirmed"`, `photos` to `[]`, and timestamps to the current time.

Items MAY also be created through `/api/items/create-from-photo` (see
"Photo-first item creation" above), which sets `status: "pending"`, `name: ""`,
`categoryId: null`, and `photos: [<key>]`.

#### Scenario: Create an item with required fields

- **WHEN** an authenticated user submits a new item form with a non-empty name
  and a valid category (no quantity specified)
- **THEN** an item record is created with `status: "confirmed"`, `photos: []`,
  `quantity: 1`, and timestamps set to the current time

#### Scenario: Create an item with all optional fields

- **WHEN** an authenticated user submits a new item with name, category, room,
  estimated value, and `quantity: 4`
- **THEN** the item record contains all provided values including `quantity: 4`,
  `photos: []`, and appears in the item list

#### Scenario: Item name is required for standard creation

- **WHEN** an authenticated user submits a new item form with an empty name
- **THEN** the system returns a validation error and no record is created

#### Scenario: Empty name is permitted for photo-first creation

- **WHEN** an authenticated user creates an item through
  `/api/items/create-from-photo`
- **THEN** an item record is created with `name: ""` and the standard
  name-required validation does NOT apply

### Requirement: Item editing

The system MUST allow authenticated users to edit an item's name, category, room
assignment, estimated value, quantity, and `photos` (add or remove individual
photos). Index entries MUST be updated atomically with the primary record.
Editing an item MUST NOT change its `status`.

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

#### Scenario: Editing does not transition status

- **WHEN** an authenticated user edits the name of a `pending` item to a
  non-empty value
- **THEN** the persisted record has `status: "pending"` (status is unchanged by
  editing)

### Requirement: Item deletion

The system MUST allow authenticated users to delete an item. Deletion MUST
atomically remove the primary record and all index entries. After the KV write
commits, the system MUST issue a best-effort R2 DELETE for every key in the
deleted item's `photos` array; R2 delete failures MUST be logged but MUST NOT
cause the user-facing operation to fail.

#### Scenario: Delete an item

- **WHEN** an authenticated user deletes an item
- **THEN** the item record and all index entries for that item are removed and
  the item no longer appears in any list or filter view

#### Scenario: Deleting an item with photos issues R2 deletes

- **WHEN** an authenticated user deletes an item whose `photos` array has two
  keys
- **THEN** two R2 DELETE requests are issued after the KV write commits

#### Scenario: R2 delete failure does not block item deletion

- **WHEN** an authenticated user deletes an item whose photos cannot be removed
  from R2
- **THEN** the item record is still removed from KV and the user-facing response
  is success

### Requirement: Item list with search and filter

The system MUST provide a list view of all items with server-side search by name
(case-insensitive substring) and filter by category and by room. Each item row
MUST display the item's primary photo (`photos[0]`) as a thumbnail when present,
its display name (`(unbenannt)` if `name` is empty and `status` is `"pending"`,
otherwise the name), category, room, and quantity. Items with
`status: "pending"` MUST be visually distinguishable from `confirmed` items.
Each row MUST provide inline `−` and `+` actions to decrement or increment the
quantity by 1.

#### Scenario: List all items shows quantity

- **WHEN** an authenticated user visits `/items` with no filters
- **THEN** all items are displayed, each showing display name, category, room,
  and quantity

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
