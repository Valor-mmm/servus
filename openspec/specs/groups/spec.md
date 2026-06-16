# groups Specification

## Purpose

TBD - created by archiving change groups. Update Purpose after archive.

## Requirements

### Requirement: Group management

The system MUST let an authenticated user create, rename, and delete groups. A
group has a generated id, a name, an optional note, and timestamps. Group names
MUST be unique case-insensitively. Deleting a group MUST remove all of its
memberships but MUST NOT delete any item. A group MUST be able to contain items
of different categories.

#### Scenario: Create a group

- **WHEN** an authenticated user creates a group with a non-empty name
- **THEN** a group record is created and appears in the group list

#### Scenario: Duplicate group name is rejected

- **WHEN** a user creates a group with a name that already exists
  (case-insensitive)
- **THEN** the system returns a validation error and no group is created

#### Scenario: Deleting a group keeps its items

- **WHEN** a user deletes a group that has members
- **THEN** the group and its memberships are removed, and every member item
  still exists

#### Scenario: A group mixes categories

- **WHEN** items of different categories are added to one group
- **THEN** all of them are members of that group

### Requirement: Item–group membership

The system MUST support a many-to-many membership between items and groups,
stored so that both directions can be listed efficiently: a group's members and
an item's groups. Adding an item already in the group MUST be idempotent.
Removing a membership MUST remove it from both directions and MUST leave the
item and the group intact.

#### Scenario: Add an item to a group

- **WHEN** a user adds an item to a group
- **THEN** the item appears among the group's members and the group appears
  among the item's groups

#### Scenario: Membership is idempotent

- **WHEN** a user adds an item that is already in the group
- **THEN** the item appears exactly once in the group's members

#### Scenario: Remove a membership

- **WHEN** a user removes an item from a group
- **THEN** the item is no longer a member and the group no longer appears on the
  item, while both records still exist

#### Scenario: Membership indices stay consistent

- **WHEN** a membership is added or removed
- **THEN** the group→members listing and the item→groups listing reflect the
  same set with no orphaned entries on either side

### Requirement: Create-or-reuse a group from an item

From an item, a user MUST be able to add it to a group by name. Submitting a
name that matches an existing group (case-insensitive) MUST reuse that group;
submitting a new name MUST create the group and add the item. The input MUST
offer autocomplete over existing group names without requiring client-side
JavaScript.

#### Scenario: Typing a new name creates the group

- **WHEN** a user submits a group name that does not exist from an item
- **THEN** a new group is created and the item is added to it

#### Scenario: Typing an existing name reuses the group

- **WHEN** a user submits a name matching an existing group from an item
- **THEN** the item is added to that existing group rather than creating a
  duplicate

#### Scenario: Existing names are offered for autocomplete

- **WHEN** the add-to-group input is rendered on an item
- **THEN** the existing group names are available as autocomplete suggestions
  without client-side scripting

### Requirement: Item shows its groups

The item detail and edit views MUST show the groups an item belongs to, and MUST
allow removing the item from a group directly.

#### Scenario: Item lists its groups

- **WHEN** a user views an item that belongs to one or more groups
- **THEN** those groups are shown on the item

#### Scenario: Remove from a group on the item

- **WHEN** a user removes one of the item's groups from the item view
- **THEN** the membership is removed and the group is no longer shown on the
  item

### Requirement: Group views with ordering

The system MUST provide a group list page and a group detail page. The detail
page MUST list the group's members and MUST let the user reorder them,
persisting the order as a per-membership position. A group with no explicit
ordering MUST display its members in a stable default order. Reordering MUST NOT
require a page reload to feel responsive, but the ordered list MUST still render
correctly without client-side JavaScript.

#### Scenario: Group detail lists members in order

- **WHEN** a user opens a group whose members have been ordered
- **THEN** the members are displayed in the persisted order

#### Scenario: Reordering persists

- **WHEN** a user reorders the members of a group and the change is saved
- **THEN** reopening the group shows the members in the new order

#### Scenario: Unordered group has a stable default order

- **WHEN** a user opens a group whose members have never been reordered
- **THEN** the members are shown in a stable, predictable order

### Requirement: Cascade cleanup on deletion

Deleting an item MUST remove all of that item's group memberships from both
directions. Deleting a group MUST remove all of its memberships. Neither
operation MUST leave orphaned membership entries.

#### Scenario: Deleting an item clears its memberships

- **WHEN** an item that belongs to groups is deleted
- **THEN** it no longer appears in any group's member list and no membership
  entry referencing it remains

#### Scenario: Deleting a group clears its memberships

- **WHEN** a group with members is deleted
- **THEN** no membership entry referencing that group remains on any item
