## ADDED Requirements

### Requirement: Container-capable items

An item MUST be selectable as a container only when its category has
`canContain: true`. The system MUST offer exactly such items in the container
selector and MUST reject any attempt to set an item's `containerId` to an item
whose category is not container-capable.

#### Scenario: Only container-capable items are offered as containers

- **WHEN** an authenticated user opens the container selector on the item create
  or edit form
- **THEN** the selectable containers are exactly the items whose category has
  `canContain: true`

#### Scenario: Assigning a non-container item as container is rejected

- **WHEN** an authenticated user attempts to set an item's `containerId` to an
  item whose category has `canContain: false`
- **THEN** the system returns a validation error and the `containerId` is not
  changed

### Requirement: Container selector is searchable and grouped by room with lazy loading

The container selector MUST be searchable by item name. Containers MUST be
grouped into collapsible accordion panels — one panel per room, plus one
dedicated panel for container-capable items that have no room assigned. Each
panel's contents MUST be fetched only when that panel is expanded; no containers
are loaded until the user opens a panel. A search query MUST fetch matching
containers across all rooms on demand and display them regardless of which
accordion panel would normally hold them.

#### Scenario: Container selector opens with collapsed room panels

- **WHEN** an authenticated user opens the container selector
- **THEN** accordion panels are shown (one per room, plus one "no room" panel)
  and no containers are pre-loaded

#### Scenario: Expanding a room panel loads its containers

- **WHEN** an authenticated user expands a room panel in the container selector
- **THEN** the system fetches and displays the container-capable items whose
  root room is that room

#### Scenario: Search fetches matching containers across all rooms

- **WHEN** an authenticated user types a search term in the container selector
- **THEN** matching container-capable items from all rooms are fetched and
  displayed, grouped by room

#### Scenario: Containers with no room appear in a dedicated panel

- **WHEN** the container selector is opened and at least one container-capable
  item has no room assigned
- **THEN** a dedicated "no room" panel is present and expandable, listing those
  items when opened

### Requirement: Containment parent pointer

An item MUST carry a single `containerId: string | null` referencing the item it
sits inside. `null` means the item is not contained. The relationship MAY nest
to any depth (a container item MAY itself have a `containerId`).

#### Scenario: Place an item into a container

- **WHEN** an authenticated user sets an item's `containerId` to a
  container-capable item
- **THEN** the item record has `containerId` set and the item appears in that
  container's contents

#### Scenario: Nested containment is permitted

- **WHEN** a container-capable item that already contains items is itself placed
  into another container-capable item
- **THEN** both `containerId` assignments are accepted, forming a chain of depth
  greater than one

#### Scenario: Remove an item from its container

- **WHEN** an authenticated user clears an item's `containerId`
- **THEN** `item.containerId` is `null` and the item no longer appears in any
  container's contents

### Requirement: Room is derived through the containment chain

An item's effective room MUST be derived from its containment chain: only the
root item of a chain (the item whose `containerId` is `null`) owns a stored
`roomId`; every contained item's effective room is the root's room. A contained
item MUST have `roomId: null` in storage. This is the root-owns-room invariant.

#### Scenario: Contained item inherits the root's room

- **WHEN** item A (room "Flur") contains box B which contains tool C
- **THEN** the effective room of both B and C is "Flur", while only A has a
  stored `roomId`

#### Scenario: Placing an item into a container clears its stored room

- **WHEN** an authenticated user places an item that had `roomId` set into a
  container
- **THEN** the item's stored `roomId` becomes `null` and its effective room is
  derived from the container chain

#### Scenario: Moving a container re-homes its contents

- **WHEN** the room of a root container is changed from "Flur" to "Keller"
- **THEN** the effective room of every item in its chain becomes "Keller" with
  no per-item update

#### Scenario: Contained items resolve into the room view

- **WHEN** an authenticated user views the item list filtered by room "Flur" and
  a tool is contained (transitively) by an item whose root room is "Flur"
- **THEN** that tool is included in the "Flur" results

### Requirement: Containment cycle protection

The system MUST reject any `containerId` assignment that would create a cycle —
that is, where the chosen container is the item itself or any item already
inside the item's own subtree. This prevents an unresolvable chain that can
never derive a room.

#### Scenario: Self-containment is rejected

- **WHEN** an authenticated user attempts to set an item's `containerId` to its
  own id
- **THEN** the system returns a validation error and no change is made

#### Scenario: Descendant-as-container is rejected

- **WHEN** an authenticated user attempts to place container A into a container
  that is somewhere inside A
- **THEN** the system returns a validation error and no change is made

### Requirement: Box and container assignment are mutually exclusive

An item MUST NOT have both a `containerId` and a `boxId` set simultaneously. On
the create and edit forms, selecting a container MUST clear and disable the box
assignment field; selecting a box MUST clear and disable the container
assignment field. The server MUST reject any submission where both fields are
non-null.

#### Scenario: Selecting a container disables the box field

- **WHEN** an authenticated user selects a container on the item create or edit
  form
- **THEN** any current box selection is cleared and the box field is disabled
  for the duration of the container selection

#### Scenario: Selecting a box disables the container field

- **WHEN** an authenticated user selects a box on the item create or edit form
- **THEN** any current container selection is cleared and the container field is
  disabled for the duration of the box selection

#### Scenario: Submitting with both box and container is rejected

- **WHEN** an authenticated user submits an item record with both `boxId` and
  `containerId` set to non-null values
- **THEN** the system returns a validation error and no record is created or
  modified

### Requirement: Container contents view

The detail page of a container-capable item MUST list the items currently
directly inside it and MUST show a location breadcrumb resolving the chain up to
its room.

#### Scenario: Container detail lists its contents

- **WHEN** an authenticated user views the detail page of a container item that
  holds three items
- **THEN** the page lists those three items with their display names

#### Scenario: Container detail shows a location breadcrumb

- **WHEN** an authenticated user views the detail page of box B that sits inside
  cabinet A in room "Flur"
- **THEN** the page shows a breadcrumb of the form "Flur → A → B"

#### Scenario: Empty container shows no contents

- **WHEN** an authenticated user views a container-capable item with nothing
  inside it
- **THEN** the contents list is empty and the page indicates the container is
  empty

### Requirement: Contained item shows its location chain

Any item with a `containerId` MUST display a "contained in" indicator on its
detail page, naming its direct parent container, and a breadcrumb resolving the
full chain from that container up to the room. This applies whether or not the
item is itself container-capable — a container that is placed inside another
container shows both its location chain and its own contents list.

#### Scenario: Contained item detail shows its direct container and breadcrumb

- **WHEN** an authenticated user views the detail page of item C whose
  `containerId` points to box B, and B sits inside cabinet A in room "Flur"
- **THEN** the page shows a "contained in: B" indicator and a breadcrumb of the
  form "Flur → A → B"

#### Scenario: Container item that is itself contained shows location and contents

- **WHEN** an authenticated user views the detail page of box B (which holds
  three tools and is itself placed inside cabinet A in room "Flur")
- **THEN** the page shows "contained in: A" with breadcrumb "Flur → A" AND the
  list of B's three contents

### Requirement: Container item deletion

When a container item that has direct contents is deleted, the system MUST warn
the user, state how many items are inside, and offer a room selector pre-filled
with the container's current derived room. If the user accepts a room, all
direct children have their `containerId` cleared and their `roomId` set to that
room, atomically with the deletion. If the user declines, the deletion still
proceeds and the direct children become room-less roots that the user must
re-place manually.

#### Scenario: Deleting a non-empty container prompts for room assignment

- **WHEN** an authenticated user initiates deletion of a container item that has
  direct contents
- **THEN** the system presents a warning stating how many items will be affected
  and offers a room selector pre-filled with the container's current derived
  room

#### Scenario: Accepting room assignment re-homes the contents on deletion

- **WHEN** the user confirms deletion and accepts (or changes) the offered room
- **THEN** all direct children have `containerId` cleared and `roomId` set to
  the chosen room, and the container is deleted — atomically

#### Scenario: Declining room assignment deletes the container and leaves children room-less

- **WHEN** the user declines the room assignment offer and confirms deletion
- **THEN** the container is deleted and all direct children become room-less
  roots requiring manual re-placement

### Requirement: Permanent container label page

The system MUST provide a printable label page for any container-capable item.
The page MUST contain the item's human-readable name and an SVG QR code linking
to the item detail URL. The label MUST NOT print the container's contents — the
contents are read live by scanning, so the printed label stays valid as contents
change. The page MUST render without navigation chrome, apply print-optimised
CSS, and render a screen-only toolbar (hidden in `@media print`) with a print
trigger and a back link.

#### Scenario: Container label renders name and QR code

- **WHEN** an authenticated user opens the label page for a container item named
  "Werkzeugkiste"
- **THEN** the page shows the name "Werkzeugkiste" and a QR code, with no
  navigation header or footer

#### Scenario: Label does not freeze contents

- **WHEN** an authenticated user opens the label page for a container item
- **THEN** the printed label does not list the items currently inside the
  container

#### Scenario: Scanning the QR code opens the item detail

- **WHEN** a user scans the QR code printed from a container label page
- **THEN** the device browser navigates to that item's detail page (login
  required), showing the current live contents

#### Scenario: Toolbar is visible on screen but absent when printing

- **WHEN** an authenticated user opens a container label page in a browser
- **THEN** a print button and a back link are visible above the label card
- **AND** the toolbar is absent from the printed output

#### Scenario: Container detail page links to the label page

- **WHEN** an authenticated user views the detail page of a container-capable
  item
- **THEN** a link or button to that item's label page is visible on the detail
  page
