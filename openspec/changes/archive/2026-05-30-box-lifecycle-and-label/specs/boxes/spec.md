## MODIFIED Requirements

### Requirement: Box status type

The `BoxStatus` type MUST be `"empty" | "packed" | "delivered"`. The former
values `"in-transit"` and `"unpacked"` are removed.

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
either manually (empty box) or via the unpack flow — before removing the live
box record. The tombstone preserves the short code so it is never reused; the
live box record and code index entry are then removed atomically.

#### Scenario: Tombstone is written on manual deletion

- **WHEN** an authenticated user deletes an empty box
- **THEN** a tombstone record is created in KV containing the box `id`, `code`,
  `label`, `destinationRoomId`, `createdAt`, `deletedAt`, and
  `reason:
  "manual"`; the box no longer appears in the box list

#### Scenario: Tombstone is written on unpack deletion

- **WHEN** a box is deleted via the unpack flow
- **THEN** a tombstone record is created with `reason: "unpacked"`; the box no
  longer appears in the box list

#### Scenario: Short codes are never reused

- **WHEN** multiple boxes have been created and some deleted
- **THEN** short codes of deleted boxes are never assigned to new boxes; the
  counter only increases

---

### Requirement: Box label page — dominant room display

The box label page MUST render the destination room name as the largest,
most-prominent element on the page. A Unicode room icon derived from the room
name MUST appear alongside the room name. If no destination room is assigned the
room section is omitted (not shown as blank).

#### Scenario: Label shows large room name with icon

- **WHEN** an authenticated user opens the label page for a box with destination
  room "Küche"
- **THEN** the page shows a large room name "Küche" with the 🍳 icon

#### Scenario: Label omits room section when no room assigned

- **WHEN** an authenticated user opens the label page for a box with no
  destination room
- **THEN** the room name and icon section is not rendered on the label

---

### Requirement: Box label page — item count badge

The label page MUST display the current number of items assigned to the box as a
badge.

#### Scenario: Item count appears on label

- **WHEN** a box has 5 items and the label page is opened
- **THEN** the label shows a badge reading "5 Gegenstände"

#### Scenario: Zero items shows empty badge

- **WHEN** a box has no items and the label page is opened
- **THEN** the label shows "0 Gegenstände"
