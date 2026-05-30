# Boxes Specification

## Requirements

### Requirement: Box creation with auto-incrementing short code

The system MUST allow authenticated users to create a box. On creation the
system MUST atomically assign the next sequential short code (format `B-NNN`,
zero-padded to at least three digits) and set status to `"empty"`. The short
code MUST be unique across all boxes. The optional `destinationRoomId` and
`label` fields are set on creation or left null.

#### Scenario: Create a box with an optional label

- **WHEN** an authenticated user submits a new box form with an optional label
- **THEN** a box record is created with the next sequential short code, status
  `"empty"`, and the label (or no label if omitted), and the box appears in the
  box list

#### Scenario: Create a box with a destination room

- **WHEN** an authenticated user submits a new box form with a destination room
  selected
- **THEN** the box record has `destinationRoomId` set to the selected room and
  the room name appears on the box detail and label pages

#### Scenario: Short codes are sequential and unique

- **WHEN** three boxes are created in sequence
- **THEN** their short codes are `B-001`, `B-002`, `B-003` (or the next values
  in the sequence), with no duplicates

---

### Requirement: Box status type

The `BoxStatus` type MUST be `"empty" | "packed" | "delivered"`.

#### Scenario: Type constraint

- **WHEN** a box record is read from or written to KV
- **THEN** its `status` field is always one of `"empty"`, `"packed"`, or
  `"delivered"`

---

### Requirement: Box status auto-tracking

Box status MUST be derived from its item count and updated atomically whenever
items are added to or removed from the box.

- A box with zero items assigned MUST have status `"empty"`.
- A box with one or more items assigned MUST have status `"packed"` (unless it
  is `"delivered"`, which is never auto-downgraded).
- The status MUST NOT be auto-changed once it is `"delivered"`.

#### Scenario: Status becomes packed when first item added

- **WHEN** the first item is added to a box (via bulk-add or item edit)
- **THEN** the box status changes to `"packed"`

#### Scenario: Status reverts to empty when last item removed

- **WHEN** the last item is removed from a box
- **THEN** the box status changes back to `"empty"`

#### Scenario: Delivered status is not auto-changed

- **WHEN** an item is removed from a `"delivered"` box
- **THEN** the box status remains `"delivered"` (it does NOT revert to `"empty"`
  or `"packed"`)

---

### Requirement: Box list

The system MUST provide a list view of all boxes, each showing its short code,
optional label, destination room (if assigned), status, and item count.

#### Scenario: List all boxes

- **WHEN** an authenticated user visits `/boxes`
- **THEN** all boxes are shown with short code, label (if any), destination room
  (if any), status, and the number of items currently assigned to each box

---

### Requirement: Box detail view

The system MUST provide a detail page for each box showing its short code,
label, destination room, status, and the list of items currently assigned to it.
Each item row MUST display the item's quantity and have a remove (unbox) action
when the box is not in `"delivered"` state.

#### Scenario: View box contents

- **WHEN** an authenticated user visits `/boxes/:id`
- **THEN** the page shows the box short code, label, destination room, status,
  and all items assigned to the box with their names and categories

#### Scenario: View box contents shows item quantity

- **WHEN** an authenticated user visits `/boxes/:id`
- **THEN** the page shows all items assigned to the box, each row displaying the
  item's name, category, and quantity

---

### Requirement: Unbox item from box detail

The system MUST allow authenticated users to remove an item from a non-delivered
box directly from the box detail page. Removing an item from a box MUST clear
the item's `boxId` (leaving `roomId` null). The item is NOT deleted.

#### Scenario: Remove item from box

- **WHEN** an authenticated user clicks the remove button for an item on the box
  detail page (box not in `"delivered"` state)
- **THEN** the item's `boxId` is set to `null`, the item no longer appears in
  the box detail view, and the item still exists in the item list

---

### Requirement: Mark box as delivered

From the detail page of a `"packed"` box an authenticated user MUST be able to
manually advance the status to `"delivered"`. This transition is one-way — no
button exists to revert from `"delivered"` to `"packed"`.

#### Scenario: Mark as delivered button appears for packed boxes

- **WHEN** an authenticated user views the detail page of a `"packed"` box
- **THEN** a "Als geliefert markieren" button is visible

#### Scenario: Mark as delivered transitions status

- **WHEN** an authenticated user clicks "Als geliefert markieren"
- **THEN** the box status becomes `"delivered"` and the page re-renders in
  delivered state

#### Scenario: No revert button for delivered boxes

- **WHEN** an authenticated user views the detail page of a `"delivered"` box
- **THEN** there is no button to revert the status to `"packed"` or `"empty"`

---

### Requirement: Per-item room placement during delivery

On the detail page of a `"delivered"` box, each item row MUST have an inline
form to place that item into a specific room. Placing an item sets its `roomId`
to the selected room, clears its `boxId`, and removes it from the box's item
list. If placing the item empties the box, the box is tombstone-deleted.

#### Scenario: Place item in room

- **WHEN** an authenticated user selects a room from the per-item dropdown and
  submits the "place" form
- **THEN** the item's `roomId` is set to the selected room, `boxId` is `null`,
  and the item no longer appears in the box detail

#### Scenario: Placing last item triggers box deletion

- **WHEN** an authenticated user places the last item from a `"delivered"` box
- **THEN** the box is tombstone-deleted and the user is redirected to `/boxes`

---

### Requirement: Assign destination room during delivery

When a `"delivered"` box has no destination room, the detail page MUST show an
inline room-assignment section. The user MUST assign a destination room before
the "unpack all remaining" action becomes available.

#### Scenario: Inline assignment section appears when no room

- **WHEN** an authenticated user views the detail page of a `"delivered"` box
  with `destinationRoomId = null`
- **THEN** an inline room select form is shown; the "Alle entpacken" button is
  NOT shown

#### Scenario: Assigning room enables unpack all

- **WHEN** an authenticated user assigns a destination room via the inline form
- **THEN** the box's `destinationRoomId` is updated and the "Alle entpacken"
  button becomes visible

---

### Requirement: Unpack all remaining items

A `"delivered"` box with a destination room MUST provide an "Alle entpacken nach
[Raumname]" button. Clicking it assigns the box's destination room to all
remaining items, clears their `boxId`, and tombstone-deletes the box.

#### Scenario: Unpack all assigns room and removes items from box

- **WHEN** an authenticated user clicks "Alle entpacken nach [Raumname]"
- **THEN** every item still in the box has its `roomId` set to the box's
  destination room and its `boxId` set to `null`; the box is tombstone-deleted
  and the user is redirected to `/boxes`

#### Scenario: Unpacked items appear in room view

- **WHEN** the box has been fully unpacked to room R
- **THEN** all formerly boxed items appear in the item list filtered by room R

---

### Requirement: Box tombstone deletion

The system MUST write a tombstone record to KV whenever a box is deleted —
either manually (empty box, `reason: "manual"`) or via the unpack flow
(`reason: "unpacked"`) — before removing the live box record. The tombstone
preserves the short code so it is never reused; the live box record and code
index entry are then removed atomically.

#### Scenario: Tombstone is written on manual deletion

- **WHEN** an authenticated user deletes an empty box
- **THEN** a tombstone record is created in KV with `reason: "manual"`; the box
  no longer appears in the box list

#### Scenario: Tombstone is written on unpack deletion

- **WHEN** a box is deleted via the unpack flow
- **THEN** a tombstone record is created with `reason: "unpacked"`; the box no
  longer appears in the box list

#### Scenario: Short codes are never reused

- **WHEN** multiple boxes have been created and some deleted
- **THEN** short codes of deleted boxes are never assigned to new boxes; the
  counter only increases

---

### Requirement: Box edit (label and destination room)

The system MUST allow authenticated users to update a box's label and
destination room.

#### Scenario: Edit box label

- **WHEN** an authenticated user submits the edit form with a new label
- **THEN** the box record is updated and the new label appears on the detail
  page, list, and label page

#### Scenario: Assign destination room

- **WHEN** an authenticated user assigns a destination room to a box via the
  edit form
- **THEN** the box record has `destinationRoomId` set and the room name appears
  on the detail page, list, and label page

#### Scenario: Clear destination room

- **WHEN** an authenticated user clears the destination room field
- **THEN** `box.destinationRoomId` is `null` and no room is shown on the detail
  page or label page

---

### Requirement: Bulk-add items to a box (create-only)

The system MUST allow authenticated users to add multiple items to a box in a
single operation by entering item names in a textarea (comma-separated or
one-per-line). Each non-empty name MUST create a new item with that name
assigned to the box. No matching against existing items is performed. All new
items are created with `status: "confirmed"`, `categoryId: null`,
`roomId:
null`, and `boxId` set to the current box.

#### Scenario: Bulk-add creates new items

- **WHEN** an authenticated user submits a textarea with three item names to a
  box
- **THEN** three new items are created, each assigned to that box, and all three
  appear in the box detail view

#### Scenario: Bulk-add with blank lines is ignored

- **WHEN** the textarea contains blank lines or extra whitespace between item
  names
- **THEN** blank entries are silently skipped and only non-empty names are
  processed

#### Scenario: Bulk-add result summary

- **WHEN** a bulk-add POST completes
- **THEN** the detail page is re-rendered showing the newly added items and a
  summary of how many items were added

---

### Requirement: Box label page

The system MUST provide a printable label page for each box. The page MUST
contain: the destination room name as the largest element (with a Unicode room
icon derived from the room name), the short code, the optional label text, an
item count badge, and an SVG QR code linking to the box detail URL. The page
MUST render without navigation chrome and MUST apply print-optimised CSS.

#### Scenario: Label page renders dominant room name with icon

- **WHEN** an authenticated user opens the label page for a box with destination
  room "Küche"
- **THEN** the page shows a large room name "Küche" with the 🍳 icon as the most
  prominent element

#### Scenario: Label page omits room section when no room assigned

- **WHEN** an authenticated user opens the label page for a box with no
  destination room
- **THEN** the room name and icon section is not rendered on the label

#### Scenario: Label page shows item count badge

- **WHEN** a box has 5 items and the label page is opened
- **THEN** the label shows a badge reading "5 Gegenstände"

#### Scenario: Label page renders short code, label, and QR code

- **WHEN** an authenticated user visits `/boxes/:id/label` for a box with a
  label and destination room
- **THEN** the page shows the short code, label text, QR code, and destination
  room — with no navigation header or footer

#### Scenario: Scanning a QR code opens the box detail

- **WHEN** a user scans the QR code printed from the label page
- **THEN** the device browser navigates to the box detail page (login required)
