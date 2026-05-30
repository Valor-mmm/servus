## ADDED Requirements

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

### Requirement: Box list

The system MUST provide a list view of all boxes, each showing its short code,
optional label, destination room (if assigned), status, and item count.

#### Scenario: List all boxes

- **WHEN** an authenticated user visits `/boxes`
- **THEN** all boxes are shown with short code, label (if any), destination room
  (if any), status, and the number of items currently assigned to each box

### Requirement: Box detail view

The system MUST provide a detail page for each box showing its short code,
label, destination room, status, and the list of items currently assigned to it.
Each item row MUST have a remove (unbox) action.

#### Scenario: View box contents

- **WHEN** an authenticated user visits `/boxes/:id`
- **THEN** the page shows the box short code, label, destination room, status,
  and all items assigned to the box with their names and categories

### Requirement: Unbox item from box detail

The system MUST allow authenticated users to remove an item from a box directly
from the box detail page. Removing an item from a box MUST clear the item's
`boxId` (leaving `roomId` null). The item is NOT deleted.

#### Scenario: Remove item from box

- **WHEN** an authenticated user clicks the remove button for an item on the box
  detail page
- **THEN** the item's `boxId` is set to `null`, the item no longer appears in
  the box detail view, and the item still exists in the item list

### Requirement: Box label page

The system MUST provide a printable label page for each box. The page MUST
contain: an SVG QR code linking to the box detail URL, the short code in large
readable text, the optional label text, and the destination room name (if
assigned at the time the page is opened). The page MUST render without
navigation chrome and MUST apply print-optimised CSS so it prints cleanly.

#### Scenario: Label page renders all fields

- **WHEN** an authenticated user visits `/boxes/:id/label` for a box with a
  label and destination room
- **THEN** the page shows the SVG QR code, the short code in large text, the
  label text, and the destination room name, with no navigation header or footer

#### Scenario: Label page with no room or label

- **WHEN** an authenticated user visits `/boxes/:id/label` for a box with no
  label and no destination room
- **THEN** the page shows only the QR code and short code; room and label
  sections are omitted (not shown as blank placeholders)

#### Scenario: Scanning a QR code opens the box detail

- **WHEN** a user scans the QR code printed from the label page
- **THEN** the device browser navigates to the box detail page showing that
  box's contents (login required)

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

### Requirement: Box deletion (empty boxes only)

The system MUST allow authenticated users to delete a box that has no items
assigned to it. Deleting a non-empty box MUST be rejected.

#### Scenario: Delete an empty box

- **WHEN** an authenticated user deletes a box with no assigned items
- **THEN** the box record is removed and the box no longer appears in the list

#### Scenario: Delete a non-empty box is rejected

- **WHEN** an authenticated user attempts to delete a box that has one or more
  items assigned to it
- **THEN** the system returns an error and the box is not deleted

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
