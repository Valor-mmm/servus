## REMOVED Requirements

### Requirement: Pending status for photo-first items

**Reason**: Replaced by "Incomplete status for photo-first items" with renamed
status values. **Migration**: Run `scripts/migrate-item-status.ts`; items with
`status: "pending"` become `status: "incomplete"`.

---

## ADDED Requirements

### Requirement: Incomplete status for photo-first items

Items created through `/api/items/create-from-photo` MUST have
`status: "incomplete"`. Editing an incomplete item's name, category, room, box,
quantity, or photos does NOT automatically change its status — the user must
explicitly save with the "Speichern & fertig" button to mark it complete, or
"Speichern & unvollständig" to save and keep it incomplete. While incomplete, an
item behaves identically to a `complete` item for box assignment, room
assignment, quantity actions, and inclusion in all list views.

#### Scenario: Incomplete item with name stays incomplete unless explicitly completed

- **WHEN** an authenticated user edits an `incomplete` item, gives it a name,
  and saves using "Speichern & unvollständig"
- **THEN** the persisted record has the new name and `status: "incomplete"`

#### Scenario: Incomplete item saved as complete transitions status

- **WHEN** an authenticated user edits an `incomplete` item and saves using
  "Speichern & fertig"
- **THEN** the persisted record has `status: "complete"`

#### Scenario: Incomplete item counts toward box packed status

- **WHEN** a photo-first capture creates an `incomplete` item assigned to an
  empty box
- **THEN** the box's status auto-transitions from `"empty"` to `"packed"`

---

### Requirement: Incomplete-items sequential triage

The system MUST provide a route `/items/incomplete` that presents items with
`status: "incomplete"` as a sequential, one-at-a-time editor. Items MUST be
ordered by creation time (oldest first). The page MUST show:

- The position indicator "N von M" (current index 1-based of total incomplete
  count).
- The current item's full inline edit form.
- Two save buttons: "Speichern & fertig" (saves with `status: "complete"` and
  advances to the next incomplete item) and "Speichern & unvollständig" (saves
  with `status: "incomplete"` and advances to the next incomplete item).
- Prev / next navigation links to manually step through items by index.
- A thumbnail of the item's primary photo when present.

When no incomplete items remain, the route MUST show an empty-state message.

The old route `/items/pending` MUST redirect with HTTP 301 to
`/items/incomplete`.

#### Scenario: Triage shows the oldest incomplete item first

- **WHEN** an authenticated user visits `/items/incomplete` with three
  incomplete items
- **THEN** the item with the earliest `createdAt` is shown in the edit form and
  the indicator reads "1 von 3"

#### Scenario: Save as complete auto-advances

- **WHEN** an authenticated user saves the current triage item with "Speichern &
  fertig"
- **THEN** the item's `status` becomes `"complete"`, the triage page advances to
  the next incomplete item, and the indicator updates

#### Scenario: Save as incomplete advances without completing

- **WHEN** an authenticated user saves the current triage item with "Speichern &
  unvollständig"
- **THEN** the item's `status` remains `"incomplete"` and the triage page
  advances to the next incomplete item

#### Scenario: Empty state when all items are complete

- **WHEN** an authenticated user visits `/items/incomplete` and no incomplete
  items exist
- **THEN** an empty-state message is shown and no edit form is rendered

#### Scenario: Redirect from old URL

- **WHEN** a client GETs `/items/pending`
- **THEN** the server responds with HTTP 301 and `Location: /items/incomplete`

---

## MODIFIED Requirements

### Requirement: Item creation

The system MUST allow authenticated users to create items through the standard
create form with a name, category, optional room assignment, optional box
assignment, optional container assignment, optional estimated value, and a
quantity (positive integer, default `1`). When a container is selected, the room
field MUST be locked and the item's stored `roomId` MUST be `null` (its room is
derived per the `containment` capability). On creation through the standard form
the system MUST set `status` to `"complete"`, `photos` to `[]`, `containerId`
per the selection (default `null`), and timestamps to the current time.

Items MAY also be created through `/api/items/create-from-photo` (see
"Incomplete status for photo-first items" above), which sets
`status: "incomplete"`, `name: ""`, `categoryId: null`, `containerId: null`, and
`photos: [<key>]`.

#### Scenario: Create an item with required fields

- **WHEN** an authenticated user submits a new item form with a non-empty name
  and a valid category (no quantity specified)
- **THEN** an item record is created with `status: "complete"`, `photos: []`,
  `quantity: 1`, and `estimatedValue: null`. The endpoint redirects to `/items`.

#### Scenario: Photo-first item creation

- **WHEN** an authenticated user uploads a photo to
  `/api/items/create-from-photo`
- **THEN** an item record is created with `name: ""`, `photos: [<key>]`,
  `status: "incomplete"`, and appears in the item list and in the incomplete
  triage list

#### Scenario: Photo-first item assigned to box at capture

- **WHEN** an authenticated user captures a photo with a box QR code scanned
- **THEN** an item is created with `photos: [<key>]`, `status: "incomplete"`,
  and the box's status auto-tracks to `"packed"` if it was empty

#### Scenario: Photo-first item without name accepted

- **WHEN** an authenticated user submits the create form with `name: ""` (as
  emitted by `/api/items/create-from-photo`)
- **THEN** an item record is created with `name: ""` and the standard
  name-required validation does NOT apply

---

### Requirement: Item editing

The system MUST allow authenticated users to edit an item's name, category, room
assignment, container assignment, estimated value, quantity, and `photos` (add
or remove individual photos). Index entries MUST be updated atomically with the
primary record. The edit form MUST present two save buttons: **"Speichern &
fertig"** (saves the item with `status: "complete"`) and **"Speichern &
unvollständig"** (saves the item with `status: "incomplete"`). The chosen button
determines the persisted status; the existing status value is not preserved on
save. When an item has a container assigned, the room field MUST be locked and
stored `roomId` MUST be `null`. Clearing the container assignment MUST unlock
the room field with an empty value, requiring the user to re-place the item.

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

#### Scenario: Placing an item into a container locks and clears the room

- **WHEN** an authenticated user assigns a container to an item that previously
  had a room
- **THEN** the item's stored `roomId` becomes `null`, the room field is locked,
  and the derived room is shown read-only with a hint

#### Scenario: Removing the container unlocks the room field empty

- **WHEN** an authenticated user clears the container assignment on a contained
  item
- **THEN** `item.containerId` is `null`, the room field is unlocked and empty,
  and the item has no room until the user assigns one

#### Scenario: Change an item's quantity

- **WHEN** an authenticated user changes an item's quantity
- **THEN** the updated quantity is persisted and shown in the item list and box
  detail

#### Scenario: Save as complete transitions status

- **WHEN** an authenticated user edits an `incomplete` item and saves with
  "Speichern & fertig"
- **THEN** the persisted record has `status: "complete"`

#### Scenario: Save as incomplete keeps status

- **WHEN** an authenticated user edits a `complete` item and saves with
  "Speichern & unvollständig"
- **THEN** the persisted record has `status: "incomplete"`

---

### Requirement: Item list with search and filter

The system MUST provide a list view of items with server-side search by name
(case-insensitive substring) and filter by category and by room. Each item row
MUST display the item's primary photo (`photos[0]`) as a thumbnail when present,
its display name (`(unbenannt)` if `name` is empty, otherwise the name),
category, room, and quantity. Items with `status: "incomplete"` MUST be visually
distinguishable from `complete` items. Each row MUST provide inline `−` and `+`
actions to decrement or increment the quantity by 1.

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

#### Scenario: List shows placeholder name for unnamed incomplete item

- **WHEN** an authenticated user visits `/items` and at least one item has
  `name: ""`
- **THEN** that item's row shows the placeholder display name `(unbenannt)`

#### Scenario: Incomplete items are visually distinguishable

- **WHEN** an authenticated user visits `/items` with a mix of `incomplete` and
  `complete` items
- **THEN** incomplete rows display a status indicator distinct from complete
  rows

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
