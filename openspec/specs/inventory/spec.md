# Inventory Specification

## Purpose

Defines how the household inventory is modelled and managed: categories (with
optional typed schemas), rooms, boxes, and the items that live in them. Covers
item creation (including photo-first capture), editing, deletion, quantity,
typed metadata, and the search/filter list — the core of the move workflow.

## Requirements

### Requirement: Category management

The system MUST provide a flat, admin-managed list of categories used to
classify items. Categories have a unique name, a generated ID, and a
`schemaType` selected from the built-in schema catalogue. A category MUST NOT be
deleted while any item references it. A category's `schemaType` defaults to the
generic type, under which the category behaves exactly as an untyped category.

#### Scenario: Create a category

- **WHEN** an authenticated user POSTs a non-empty category name to
  `/categories`
- **THEN** a new category record is created with `schemaType` defaulting to the
  generic type and appears in the category list

#### Scenario: Create a category with a schema type

- **WHEN** an authenticated user creates a category and selects a `schemaType`
  that exists in the built-in catalogue
- **THEN** the category record is stored with that `schemaType`

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

The system MUST provide a list view of items with server-side search by name
(case-insensitive substring) and filter by category and by room. Each item row
MUST display the item's primary photo (`photos[0]`) as a thumbnail when present,
its display name (`(unbenannt)` if `name` is empty and `status` is `"pending"`,
otherwise the name), category, room, and quantity. Items with
`status: "pending"` MUST be visually distinguishable from `confirmed` items.
Each row MUST provide inline `−` and `+` actions to decrement or increment the
quantity by 1.

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

#### Scenario: Filter by category uses index

- **WHEN** an authenticated user filters by a specific category
- **THEN** only items with that category are shown, loaded via the category
  secondary index

#### Scenario: Filter by room uses index

- **WHEN** an authenticated user filters by a specific room
- **THEN** only items with that room assignment are shown, loaded via the room
  secondary index

#### Scenario: Search by name loads full corpus

- **WHEN** an authenticated user enters a search term
- **THEN** all items are loaded server-side and only those whose name contains
  the term (case-insensitive) are shown

#### Scenario: Combined filter and search

- **WHEN** an authenticated user applies a category filter and a name search
  simultaneously
- **THEN** items are loaded via the category index and filtered server-side by
  the search term; only items matching both conditions are shown

### Requirement: KV index consistency

The system MUST maintain category, room, and time indexes atomically with every
item mutation. No mutation MUST leave the indexes in a state inconsistent with
the primary item records.

#### Scenario: Category and room indexes reflect item after create

- **WHEN** an item is created with category C and room R
- **THEN** the item appears in the prefix scan for `["item-by-category", C]` and
  `["item-by-room", R]`

#### Scenario: Time index reflects item after create

- **WHEN** an item is created
- **THEN** a `["item-by-time", createdAt, id]` entry exists in KV

#### Scenario: Category index reflects item after update

- **WHEN** an item's category is changed from C1 to C2
- **THEN** the item no longer appears under `["item-by-category", C1]` and does
  appear under `["item-by-category", C2]`

#### Scenario: All indexes reflect item after delete

- **WHEN** an item is deleted
- **THEN** it no longer appears in any category, room, or time index prefix scan

### Requirement: Built-in category schema catalogue

The system MUST resolve a category schema by `schemaType` from two layers: a
user-editable storage overlay checked first, then a fixed, code-defined
catalogue of built-in schemas as the fallback. Each schema has a `schemaType`
identifier, a display label, and an ordered list of field definitions. Each
field definition has a stable `key`, a display label, a `type` from the set
{text, number, enum, date, boolean}, and — for `enum` fields only — a non-empty
list of allowed options. The built-in catalogue MUST include a generic schema
whose field list is empty; the generic schema is the default for any category
that does not specify one and MUST NOT be editable. Built-in schema labels and
options are referenced by i18n key; user-defined schema labels and options are
stored as literal display text. Schema resolution MUST be exposed only through
typed accessors so callers do not depend on whether a schema is built-in or
user-defined.

#### Scenario: Generic schema is the default and has no fields

- **WHEN** the schema for the generic type is requested
- **THEN** a schema is returned whose field list is empty

#### Scenario: A built-in schema is returned when no overlay exists

- **WHEN** a schema is requested for a built-in `schemaType` with no stored
  override
- **THEN** the seeded built-in schema is returned

#### Scenario: A stored overlay takes precedence over a built-in

- **WHEN** a user-defined schema is stored under the same `schemaType` id as a
  built-in
- **THEN** the stored schema is returned instead of the built-in

#### Scenario: Unknown schema type falls back to generic

- **WHEN** a schema is requested for a `schemaType` present in neither the
  overlay nor the catalogue
- **THEN** the generic schema is returned rather than an error

### Requirement: Item typed metadata

An item MUST carry a `metadata` map holding values for the fields defined by its
category's schema. When an item is created or edited, the system MUST validate
the submitted metadata against the schema of the item's category at the write
boundary: keys not defined by the schema MUST be dropped, and each retained
value MUST conform to its field's type (number is finite, date is an ISO
calendar date, boolean is true/false, enum is one of the field's options, text
is a trimmed non-empty string). Fields with no value MUST be absent from the
stored map rather than stored as null. An item whose category uses the generic
schema MUST store an empty metadata map. Metadata MUST be stored on the item
record itself, not in a separate key, and MUST NOT introduce a new index.

#### Scenario: Metadata conforming to the schema is stored

- **WHEN** an item in a typed category is saved with metadata whose keys and
  value types match the category's schema
- **THEN** the item record stores exactly those key/value pairs in `metadata`

#### Scenario: Keys outside the schema are dropped

- **WHEN** an item is saved with a metadata key not defined by its category's
  schema
- **THEN** that key is omitted from the stored `metadata` and the rest is stored

#### Scenario: A value of the wrong type is rejected

- **WHEN** an item is saved with a metadata value that does not conform to its
  field type (e.g. a non-numeric value for a number field, or an out-of-list
  value for an enum field)
- **THEN** the system returns a validation error and the item is not saved

#### Scenario: Generic-category item stores empty metadata

- **WHEN** an item whose category uses the generic schema is created or edited
- **THEN** its stored `metadata` is empty

#### Scenario: Existing items remain valid

- **WHEN** an item created before this change (with no metadata) is read
- **THEN** it is treated as having an empty `metadata` map and renders normally

### Requirement: Schema-driven item detail editing

The item detail/edit page MUST render the fields of the item's category schema,
in definition order, after the standard item fields, using an input control
appropriate to each field type (text input, number input, date picker,
single-select, and checkbox respectively). Submitted values MUST be validated
against the schema using the same rules as the write boundary. When the item's
category uses the generic schema, no extra fields MUST be shown. All field
labels and option labels MUST be rendered through the i18n helper.

#### Scenario: Typed category shows its schema fields for editing

- **WHEN** a user opens the edit page for an item whose category has a typed
  schema
- **THEN** the schema's fields are shown in order, each with a control matching
  its field type, pre-filled with the item's current metadata values

#### Scenario: Editing and saving schema fields persists metadata

- **WHEN** the user fills in or changes schema field values and saves
- **THEN** the validated values are persisted to the item's `metadata` and shown
  on the next load

#### Scenario: Generic category shows no extra fields

- **WHEN** a user opens the edit page for an item whose category uses the
  generic schema
- **THEN** no schema-specific fields are shown

### Requirement: Item warranty date field

Every item MUST support an optional `warrantyUntil` date as a core item field,
independent of its category schema. It is editable on every item alongside the
existing estimated-value field, MUST accept an ISO calendar date or be absent,
and MUST be validated at the write boundary. It MUST NOT be part of the schema
`metadata` map.

#### Scenario: Set a warranty date on any item

- **WHEN** a user sets a valid `warrantyUntil` date on an item, regardless of
  the item's category or schema
- **THEN** the date is stored on the item record and shown on the next load

#### Scenario: Warranty date is optional

- **WHEN** an item is saved without a `warrantyUntil` value
- **THEN** the item is stored with no warranty date and renders normally

#### Scenario: Invalid warranty date is rejected

- **WHEN** an item is saved with a `warrantyUntil` value that is not an ISO
  calendar date
- **THEN** the system returns a validation error and the item is not saved

### Requirement: Item list excludes typed fields

The item list view MUST remain minimal, showing only the item's photo thumbnail,
name, and category. Schema-specific metadata fields MUST NOT appear in the list
view; they are presented only on the item detail/edit page.

#### Scenario: List view omits metadata

- **WHEN** the item list is rendered for items in typed categories
- **THEN** each row shows only thumbnail, name, and category, and no
  schema-specific metadata values appear in the list

### Requirement: Create a user-defined category schema

An authenticated user MUST be able to create a new category schema through the
UI by providing a display name and an ordered list of fields. The created schema
MUST be persisted to the storage overlay and MUST immediately be selectable as a
category type and usable to drive item fields, exactly like a built-in schema.
The new schema's `schemaType` id MUST be generated or validated to be unique
across both the overlay and the built-in catalogue.

#### Scenario: Create a schema with fields

- **WHEN** a user submits a new schema with a name and one or more valid fields
- **THEN** the schema is stored, appears in the category type list, and its
  fields render on the item edit page for categories using it

#### Scenario: New schema id is unique

- **WHEN** a user creates a schema whose id would collide with an existing
  overlay or built-in schemaType
- **THEN** the system rejects it or assigns a distinct id, and no existing
  schema is overwritten unintentionally

### Requirement: Edit a category schema

An authenticated user MUST be able to edit the display name and field list of a
user-defined schema, and MUST be able to extend a built-in schema by editing it
— which materialises an editable copy into the overlay (copy-on-write) that then
takes precedence. A schema's `schemaType` id MUST be immutable once created.
Editing a schema's fields MUST NOT corrupt existing items: values for fields
that no longer exist are simply not rendered, and remaining fields continue to
validate normally.

#### Scenario: Edit a user-defined schema's fields

- **WHEN** a user adds, removes, or reorders fields on a user-defined schema and
  saves
- **THEN** the stored schema reflects the change and item edit pages render the
  updated field set

#### Scenario: Extending a built-in materialises an override

- **WHEN** a user edits a built-in schema (e.g. adds a field) and saves
- **THEN** an overlay copy is stored under the same `schemaType` id and is
  returned by subsequent schema resolution, while the seed remains the fallback

#### Scenario: Removed field does not break existing items

- **WHEN** a field is removed from a schema that existing items have values for
- **THEN** those items load without error and the removed field's value is not
  shown

### Requirement: Category schema definition validation

The system MUST validate a submitted schema definition at the write boundary.
The `schemaType` id MUST be non-empty and unique; each field MUST have a
non-empty key that is unique within the schema; each field's type MUST be one of
the five allowed types; and an `enum` field MUST declare at least one option. A
definition violating any of these MUST be rejected with a validation error and
MUST NOT be persisted.

#### Scenario: Duplicate field key is rejected

- **WHEN** a user submits a schema with two fields sharing the same key
- **THEN** the system returns a validation error and the schema is not saved

#### Scenario: Enum field without options is rejected

- **WHEN** a user submits a schema with a single-select field that has no
  options
- **THEN** the system returns a validation error and the schema is not saved

### Requirement: Delete a user-defined category schema

An authenticated user MUST be able to delete a user-defined schema only when no
category references it. Built-in schemas (including generic) MUST NOT be
deletable; deleting an overlay override of a built-in MUST revert resolution to
the seeded built-in.

#### Scenario: Delete an unused user-defined schema

- **WHEN** a user deletes a user-defined schema that no category uses
- **THEN** the schema is removed from the overlay and no longer appears in the
  category type list

#### Scenario: Delete a schema in use is rejected

- **WHEN** a user attempts to delete a schema that one or more categories use
- **THEN** the system returns an error and the schema is not deleted

#### Scenario: Removing a built-in override reverts to the seed

- **WHEN** a user deletes an overlay override that shadowed a built-in
  schemaType
- **THEN** schema resolution for that id returns the seeded built-in again
