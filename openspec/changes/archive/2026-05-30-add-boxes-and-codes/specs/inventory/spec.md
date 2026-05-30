## MODIFIED Requirements

### Requirement: Item creation

The system MUST allow authenticated users to create items with a name, category,
and optional room assignment, optional box assignment, and optional estimated
value. On creation the system MUST set `status` to `"confirmed"` and `photoKey`
to `null`. Providing both `roomId` and `boxId` MUST be rejected. When a `boxId`
is provided the system MUST set `roomId` to `null`.

#### Scenario: Create an item with required fields

- **WHEN** an authenticated user submits a new item form with a non-empty name
  and a valid category
- **THEN** an item record is created with `status: "confirmed"`,
  `photoKey: null`, `roomId: null`, `boxId: null`, and timestamps set to the
  current time

#### Scenario: Create an item with all optional fields

- **WHEN** an authenticated user submits a new item with name, category, room,
  and estimated value
- **THEN** the item record contains all provided values and appears in the item
  list filtered by that category and that room

#### Scenario: Create an item assigned to a box

- **WHEN** an authenticated user submits a new item with a valid box assignment
- **THEN** the item record has `boxId` set to the selected box and `roomId` set
  to `null`, and the item appears in that box's detail view

#### Scenario: Item name is required

- **WHEN** an authenticated user submits a new item form with an empty name
- **THEN** the system returns a validation error and no record is created

### Requirement: Item editing

The system MUST allow authenticated users to edit an item's name, category, room
assignment, box assignment, and estimated value. Index entries MUST be updated
atomically with the primary record. Setting `boxId` MUST atomically clear
`roomId`; setting `roomId` MUST atomically clear `boxId`. Providing both
simultaneously MUST be rejected.

#### Scenario: Change an item's category

- **WHEN** an authenticated user changes an item's category from A to B
- **THEN** the item no longer appears under category A's index and appears under
  category B's index

#### Scenario: Change an item's room

- **WHEN** an authenticated user changes an item's room from X to Y
- **THEN** the item no longer appears under room X's index and appears under
  room Y's index, and `boxId` is `null`

#### Scenario: Remove an item's room assignment

- **WHEN** an authenticated user clears the room field on an item
- **THEN** `item.roomId` is `null` and the item no longer appears in any room
  index

#### Scenario: Assign an item to a box

- **WHEN** an authenticated user assigns an item to a box
- **THEN** `item.boxId` is set to the box ID, `item.roomId` is set to `null`,
  the old room index entry is removed, and the item appears in the box's
  `["item-by-box", boxId]` index

#### Scenario: Remove an item's box assignment

- **WHEN** an authenticated user clears the box field on an item
- **THEN** `item.boxId` is `null` and the item no longer appears in the
  `["item-by-box", boxId]` index

## ADDED Requirements

### Requirement: KV index consistency for box assignment

The system MUST maintain the `["item-by-box", boxId, itemId]` index atomically
with every item mutation that changes `boxId`. No mutation MUST leave the index
in a state inconsistent with the primary item records.

#### Scenario: Index reflects item after box assignment

- **WHEN** an item is assigned to box B
- **THEN** the item appears in the prefix scan for `["item-by-box", B]` and no
  longer appears under any room index

#### Scenario: Index reflects item after box removal

- **WHEN** an item's box assignment is cleared
- **THEN** the item no longer appears in the prefix scan for
  `["item-by-box", B]`
