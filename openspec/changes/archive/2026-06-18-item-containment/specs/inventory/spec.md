## MODIFIED Requirements

### Requirement: Category management

The system MUST provide a flat, admin-managed list of categories used to
classify items. Categories have a unique name, a generated ID, a `schemaType`
selected from the built-in schema catalogue, and a `canContain` boolean flag. A
category MUST NOT be deleted while any item references it. A category's
`schemaType` defaults to the generic type, under which the category behaves
exactly as an untyped category. A category's `canContain` defaults to `false`;
when `true`, items in that category may contain other items (see the
`containment` capability).

#### Scenario: Create a category

- **WHEN** an authenticated user POSTs a non-empty category name to
  `/categories`
- **THEN** a new category record is created with `schemaType` defaulting to the
  generic type, `canContain` defaulting to `false`, and appears in the category
  list

#### Scenario: Create a category with a schema type

- **WHEN** an authenticated user creates a category and selects a `schemaType`
  that exists in the built-in catalogue
- **THEN** the category record is stored with that `schemaType`

#### Scenario: Create a container-capable category

- **WHEN** an authenticated user creates a category with the "can contain"
  option enabled
- **THEN** the category record is stored with `canContain: true`

#### Scenario: Toggle can-contain on an existing category

- **WHEN** an authenticated user edits a category and changes its "can contain"
  option
- **THEN** the category's `canContain` flag is updated to the submitted value

#### Scenario: Disabling can-contain is rejected while containers are occupied

- **WHEN** an authenticated user attempts to set a category's `canContain` to
  `false` while one or more items in that category currently hold other items
  inside them
- **THEN** the system returns a validation error explaining that all containers
  in that category must be emptied before the flag can be disabled

#### Scenario: Unknown schema type is rejected

- **WHEN** an authenticated user creates or edits a category with a `schemaType`
  not present in the built-in catalogue
- **THEN** the system returns a validation error and no record is created or
  modified

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

### Requirement: Item creation

The system MUST allow authenticated users to create items through the standard
create form with a name, category, optional room assignment, optional box
assignment, optional container assignment, optional estimated value, and a
quantity (positive integer, default `1`). When a container is selected, the room
field MUST be locked and the item's stored `roomId` MUST be `null` (its room is
derived per the `containment` capability). On creation through the standard form
the system MUST set `status` to `"confirmed"`, `photos` to `[]`, `containerId`
per the selection (default `null`), and timestamps to the current time.

Items MAY also be created through `/api/items/create-from-photo` (see
"Photo-first item creation" above), which sets `status: "pending"`, `name: ""`,
`categoryId: null`, `containerId: null`, and `photos: [<key>]`.

#### Scenario: Create an item with required fields

- **WHEN** an authenticated user submits a new item form with a non-empty name
  and a valid category (no quantity specified)
- **THEN** an item record is created with `status: "confirmed"`, `photos: []`,
  `quantity: 1`, `containerId: null`, and timestamps set to the current time

#### Scenario: Create an item with all optional fields

- **WHEN** an authenticated user submits a new item with name, category, room,
  estimated value, and `quantity: 4`
- **THEN** the item record contains all provided values including `quantity: 4`,
  `photos: []`, and appears in the item list

#### Scenario: Create an item inside a container

- **WHEN** an authenticated user submits a new item with a container selected
- **THEN** the item record has `containerId` set, `roomId: null`, and appears in
  that container's contents

#### Scenario: Selecting a container locks the room field on create

- **WHEN** an authenticated user selects a container on the create form
- **THEN** the room field is disabled and shows the container's derived room
  read-only with a hint that the room is taken from the container

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
assignment, container assignment, estimated value, quantity, and `photos` (add
or remove individual photos). Index entries MUST be updated atomically with the
primary record. Editing an item MUST NOT change its `status`. When an item has a
container assigned, the room field MUST be locked and stored `roomId` MUST be
`null`. Clearing the container assignment MUST unlock the room field with an
empty value, requiring the user to re-place the item.

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

#### Scenario: Editing does not transition status

- **WHEN** an authenticated user edits the name of a `pending` item to a
  non-empty value
- **THEN** the persisted record has `status: "pending"` (status is unchanged by
  editing)
