# Inventory Specification

## MODIFIED Requirements

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

## ADDED Requirements

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
