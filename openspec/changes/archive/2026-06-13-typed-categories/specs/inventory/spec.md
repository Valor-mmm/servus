# Inventory Specification

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Built-in category schema catalogue

The system MUST expose a fixed, code-defined catalogue of category schemas. Each
schema has a `schemaType` identifier, a display label, and an ordered list of
field definitions. Each field definition has a stable `key`, a display label, a
`type` from the set {text, number, enum, date, boolean}, and — for `enum` fields
only — a non-empty list of allowed options. The catalogue MUST include a generic
schema whose field list is empty; the generic schema is the default for any
category that does not specify one. Display labels and enum options MUST be
referenced by i18n key, never as literal copy, so the catalogue stays
language-agnostic.

The catalogue MUST be read only through a typed accessor; callers MUST NOT
depend on the raw catalogue structure, so that catalogue entries can later be
sourced from storage without changing callers.

#### Scenario: Generic schema is the default and has no fields

- **WHEN** the schema for the generic type is requested
- **THEN** a schema is returned whose field list is empty

#### Scenario: A typed schema exposes its ordered fields

- **WHEN** the schema for a typed category (e.g. the book type) is requested
- **THEN** a schema is returned listing its fields in definition order, each
  with a stable key and a field type from the allowed set

#### Scenario: Unknown schema type falls back to generic

- **WHEN** a schema is requested for a `schemaType` not present in the catalogue
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
