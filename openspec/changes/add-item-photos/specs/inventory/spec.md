## ADDED Requirements

### Requirement: Item photos collection

Every `Item` record MUST have a `photos` field of type `string[]`: an ordered
list of R2 object keys. The first element (`photos[0]`) is the primary / cover
photo and is the one displayed in list and box-detail thumbnails. The default
value when no photos are present MUST be `[]`. The field MUST replace the
previous `photoKey: string | null` field on the type.

Each key in the array MUST be a key that the system generated through the
presigned-upload flow. Order is preserved across reads and writes.

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

---

### Requirement: Legacy item records read back with empty photo list

The repository read layer (`findItem`, `listItems`) MUST coerce item records
persisted before this change — which carry no `photos` field — to `photos: []`
at read time so all consumers see a consistent shape. No write-side rewrite of
legacy records is required.

#### Scenario: Legacy record without photos field reads as empty list

- **WHEN** an item record exists in KV without a `photos` field (pre-migration,
  possibly with a `photoKey` field)
- **THEN** `findItem` and `listItems` return that item with `photos: []`

#### Scenario: Legacy photoKey field is ignored

- **WHEN** an item record exists in KV with `photoKey: "abc"` and no `photos`
  field
- **THEN** the record is read with `photos: []` and the legacy `photoKey` value
  is not surfaced to any consumer

---

### Requirement: Photo-first item creation

The system MUST provide a `POST /api/items/create-from-photo` endpoint that,
given a previously uploaded R2 photo key and an optional `boxId`, creates a new
item with:

- `name: ""`,
- `categoryId: null`,
- `roomId: null` (unless `boxId` is provided, in which case room follows the
  existing box/room mutual-exclusion rule already in this spec),
- `boxId: <as provided, or null>`,
- `quantity: 1`,
- `estimatedValue: null`,
- `photos: [<key>]`,
- `status: "pending"`,
- timestamps set to the current time.

The endpoint MUST require an authenticated session and a valid CSRF token. Index
entries (by-category, by-room, by-box) MUST be written atomically with the
primary record, treating `null` category and `null` room as "no index entry."

#### Scenario: Create item from photo with no box

- **WHEN** an authenticated user POSTs to `/api/items/create-from-photo` with a
  valid photo key and no `boxId`
- **THEN** an item record is created with empty name, null category,
  `quantity: 1`, `photos: [<key>]`, `status: "pending"`, and appears in the item
  list and in the pending list

#### Scenario: Create item from photo into a box

- **WHEN** an authenticated user POSTs to `/api/items/create-from-photo` with a
  valid photo key and `boxId: "B"`
- **THEN** an item record is created with `boxId: "B"`, `roomId: null`,
  `photos: [<key>]`, `status: "pending"`, and the box's status auto-tracks to
  `"packed"` if it was previously `"empty"`

#### Scenario: Create-from-photo requires authentication

- **WHEN** an unauthenticated client POSTs to `/api/items/create-from-photo`
- **THEN** the response is `401` and no item is created

#### Scenario: Create-from-photo requires CSRF token

- **WHEN** an authenticated user POSTs without a valid CSRF token
- **THEN** the response is `403` and no item is created

---

### Requirement: Append photo to existing item

The system MUST provide a `POST /api/items/append-photo` endpoint that appends a
previously uploaded R2 photo key to an existing item's `photos` array. The
endpoint MUST require an authenticated session and a valid CSRF token, and the
write MUST be atomic with respect to index entries (none of which depend on
`photos`, but the record write itself MUST be single-shot).

#### Scenario: Append photo to confirmed item

- **WHEN** an authenticated user appends a new photo to a `confirmed` item that
  already has one photo
- **THEN** the item's `photos` array has two elements with the original key at
  index `0` and the new key at index `1`; `status` remains `"confirmed"`

#### Scenario: Append photo to pending item

- **WHEN** an authenticated user appends a new photo to a `pending` item
- **THEN** the item's `photos` array grows by one and `status` remains
  `"pending"` (appending does not transition status)

---

### Requirement: Remove photo from item

The system MUST allow authenticated users to remove a single photo from an
item's `photos` array. The removed R2 object MUST be deleted via the photos
capability's best-effort delete contract. Status MUST NOT change as a
consequence of removing a photo, even if the array becomes empty.

#### Scenario: Remove a non-primary photo

- **WHEN** an authenticated user removes `photos[1]` from an item with three
  photos
- **THEN** the persisted `photos` array has two elements (`photos[0]` and the
  original `photos[2]`), and a best-effort R2 `DELETE` is issued for the removed
  key

#### Scenario: Remove the only photo of a pending item

- **WHEN** an authenticated user removes the only photo from a `pending` item
- **THEN** the persisted `photos` array is empty and the item's `status` remains
  `"pending"`

---

### Requirement: Pending status for photo-first items

The system MUST set `status: "pending"` on items created through
`/api/items/create-from-photo`. Pending items MUST remain in `pending` state
regardless of edits to `name`, `categoryId`, `roomId`, `boxId`, `quantity`, or
`photos` performed in this change. No code path introduced by this change MUST
transition `status` from `"pending"` to `"confirmed"` or `"suggested"`; the
transition is reserved for a future classification capability.

While in `pending` state, an item MUST behave identically to a `confirmed` item
for the purposes of:

- box assignment (it counts toward box `packed` status),
- room assignment (direct or via box),
- quantity increment/decrement actions,
- inclusion in the item list and box detail views.

#### Scenario: Pending item with name remains pending

- **WHEN** an authenticated user edits a `pending` item and gives it the name
  "Bohrmaschine"
- **THEN** the persisted record has `name: "Bohrmaschine"` and
  `status: "pending"`

#### Scenario: Pending item counts toward box packed status

- **WHEN** a photo-first capture creates a `pending` item assigned to an empty
  box
- **THEN** the box's status auto-transitions from `"empty"` to `"packed"`

#### Scenario: Pending item can be unboxed

- **WHEN** an authenticated user removes a `pending` item from a box via the
  existing unbox action
- **THEN** the item's `boxId` becomes `null` and `status` remains `"pending"`

#### Scenario: Pending item quantity is adjustable

- **WHEN** an authenticated user presses `+` on a `pending` item row
- **THEN** the item's quantity increases by 1 and `status` remains `"pending"`

---

### Requirement: Pending-items triage list

The system MUST provide a route `/items/pending` that lists all items with
`status: "pending"`, ordered by creation time (newest first). Each row MUST show
the item's primary photo as a thumbnail, the placeholder display name
(`(unbenannt)` if `name` is empty, otherwise the name), the box assignment if
any, the quantity, and a link to edit the item.

#### Scenario: Pending list shows only pending items

- **WHEN** an authenticated user visits `/items/pending` with five items in the
  system (three `pending`, two `confirmed`)
- **THEN** exactly three item rows are shown

#### Scenario: Pending list ordering

- **WHEN** an authenticated user visits `/items/pending` and there are multiple
  pending items
- **THEN** rows appear with the most recently created item first

#### Scenario: Pending row shows photo thumbnail

- **WHEN** a pending item with at least one photo appears in the list
- **THEN** its row renders an `<img>` element whose `src` is a presigned GET URL
  for `photos[0]`

## MODIFIED Requirements

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

- **WHEN** an authenticated user submits the standard new-item form with a
  non-empty name and a valid category (no quantity specified)
- **THEN** an item record is created with `status: "confirmed"`, `photos: []`,
  `quantity: 1`, and timestamps set to the current time

#### Scenario: Create an item with all optional fields

- **WHEN** an authenticated user submits a new item with name, category, room,
  estimated value, and `quantity: 4`
- **THEN** the item record contains all provided values including `quantity: 4`,
  `photos: []`, and appears in the item list

#### Scenario: Item name is required for standard creation

- **WHEN** an authenticated user submits the standard new-item form with an
  empty name
- **THEN** the system returns a validation error and no record is created

#### Scenario: Empty name is permitted for photo-first creation

- **WHEN** an authenticated user creates an item through
  `/api/items/create-from-photo`
- **THEN** an item record is created with `name: ""` and the standard
  name-required validation does NOT apply

---

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

#### Scenario: Add a photo via edit

- **WHEN** an authenticated user uploads a new photo on the item edit form
- **THEN** the new key is appended to `photos` and the edited record is
  persisted with the new array

#### Scenario: Editing does not transition status

- **WHEN** an authenticated user edits the name of a `pending` item to a
  non-empty value
- **THEN** the persisted record has `status: "pending"` (status is unchanged by
  editing in this change)

---

### Requirement: Item deletion

The system MUST allow authenticated users to delete an item. Deletion MUST
atomically remove the primary record and all index entries. After the KV write
commits, the system MUST issue a best-effort R2 `DELETE` for every key in the
deleted item's `photos` array; R2 delete failures MUST be logged but MUST NOT
cause the user-facing operation to fail.

#### Scenario: Delete an item

- **WHEN** an authenticated user deletes an item
- **THEN** the item record and all index entries for that item are removed and
  the item no longer appears in any list or filter view

#### Scenario: Deleting an item with photos issues R2 deletes

- **WHEN** an authenticated user deletes an item whose `photos` array has two
  keys
- **THEN** two R2 `DELETE` requests are issued, one per key, after the KV write
  commits

#### Scenario: R2 delete failure does not block item deletion

- **WHEN** an authenticated user deletes an item whose photos cannot be removed
  from R2 (network failure)
- **THEN** the item record is still removed from KV, the failure is logged, and
  the user-facing response is success

---

### Requirement: Item list with search and filter

The system MUST provide a list view of all items with server-side search by name
(case-insensitive substring) and filter by category and by room. Each item row
MUST display the item's primary photo (`photos[0]`) as a thumbnail when present,
its display name (the placeholder `(unbenannt)` if `name` is empty, otherwise
the name), category, room, and quantity. Each row MUST provide inline `−` and
`+` actions to decrement or increment the quantity by 1. The quantity MUST NOT
be decremented below `1`; a decrement request when quantity is already `1` MUST
be silently ignored. The `+`/`−` actions MUST update the displayed quantity
in-place without a full-page reload (implemented via the `QuantityControl`
island and the `/api/items/adjust-quantity` endpoint).

Items with `status: "pending"` MUST be visually distinguishable from `confirmed`
items in the row (e.g. tinted status badge), so the user can spot un-classified
items in the regular list.

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
- **THEN** that item's row shows the placeholder display name `(unbenannt)` (via
  the locale's pending-placeholder key)

#### Scenario: Pending items are visually distinguishable

- **WHEN** an authenticated user visits `/items` with a mix of `pending` and
  `confirmed` items
- **THEN** pending rows display a status indicator distinct from confirmed rows
  (e.g. a tinted status badge)

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
