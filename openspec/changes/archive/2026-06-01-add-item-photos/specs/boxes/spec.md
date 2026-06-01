## ADDED Requirements

### Requirement: Photo-first capture from box detail

The system MUST provide a camera affordance on the detail page of every box
whose status is not `"delivered"` that, when activated, opens the device camera
(via `<input type="file" accept="image/*"
capture="environment">`) and creates a
new item assigned to the current box from each captured photo. Each created item
MUST have `status: "pending"`, `name: ""`, `categoryId: null`,
`boxId: <current box>`, and `photos: [<uploaded key>]`. The box's `packed`
status MUST auto-track as items are added, exactly as today.

The affordance MUST NOT be shown when the box is in `"delivered"` state.

#### Scenario: Camera capture on empty box creates pending item and packs box

- **WHEN** an authenticated user on an empty box's detail page captures one
  photo through the camera affordance
- **THEN** one item is created with `status: "pending"`, `name: ""`, `boxId` set
  to the current box, and `photos: [<key>]`; the box's status transitions from
  `"empty"` to `"packed"`

#### Scenario: Multiple captures create multiple items in the box

- **WHEN** an authenticated user captures three photos in succession through the
  box-detail camera affordance
- **THEN** three pending items are created, each with its own single photo, all
  assigned to the current box

#### Scenario: Camera affordance is hidden on delivered boxes

- **WHEN** an authenticated user views the detail page of a `"delivered"` box
- **THEN** the camera affordance is not rendered

## MODIFIED Requirements

### Requirement: Box detail view

The system MUST provide a detail page for each box showing its short code,
label, destination room, status, and the list of items currently assigned to it.
Each item row MUST display:

- the item's primary photo (`photos[0]`) as a thumbnail when present,
- the item's display name (the placeholder `(unbenannt)` if `name` is empty and
  `status` is `"pending"`, otherwise the name),
- the item's category,
- the item's quantity,
- a remove (unbox) action when the box is not in `"delivered"` state,
- inline `−` and `+` actions to adjust quantity by 1 (decrement at `1` is
  silently ignored; quantity actions are not available when the box is in
  `"delivered"` state).

#### Scenario: View box contents

- **WHEN** an authenticated user visits `/boxes/:id`
- **THEN** the page shows the box short code, label, destination room, status,
  and all items assigned to the box with their display names and categories

#### Scenario: View box contents shows item quantity

- **WHEN** an authenticated user visits `/boxes/:id`
- **THEN** the page shows all items assigned to the box, each row displaying the
  item's display name, category, and quantity

#### Scenario: View box contents shows item thumbnails when present

- **WHEN** an authenticated user visits `/boxes/:id` and at least one item in
  the box has a non-empty `photos` array
- **THEN** that item's row renders an `<img>` element whose `src` is a presigned
  GET URL for `photos[0]`

#### Scenario: View box contents shows pending placeholder

- **WHEN** an authenticated user visits `/boxes/:id` and at least one item in
  the box has `status: "pending"` and `name: ""`
- **THEN** that item's row shows the placeholder display name `(unbenannt)` (via
  the locale's pending-placeholder key)

#### Scenario: Increment quantity from box detail

- **WHEN** an authenticated user presses the `+` button on an item row in a
  non-delivered box
- **THEN** the item's quantity is increased by 1 and the updated count is shown
  in the box detail

#### Scenario: Decrement quantity from box detail

- **WHEN** an authenticated user presses the `−` button on an item row in a
  non-delivered box and the item's quantity is greater than 1
- **THEN** the item's quantity is decreased by 1 and the updated count is shown
  in the box detail

#### Scenario: Quantity adjust not available for delivered boxes

- **WHEN** an authenticated user views a box in `"delivered"` state
- **THEN** no `−`/`+` quantity buttons are shown on item rows

## REMOVED Requirements

### Requirement: Bulk-add items to a box (create-only)

**Reason**: The text-based bulk-add textarea is superseded by photo-first
capture. Going forward, every new item starts with a photo; typed creation
through a textarea is no longer a supported flow on the box detail page. This
was an explicit product decision: two affordances for "add an item to this box"
with different status defaults (textarea → `confirmed`, camera → `pending`) was
deemed worse UX than one consistent flow.

**Migration**: Use the new camera affordance (see "Photo-first capture from box
detail" above) to add items to a box. To add an existing text-only item to a
box, use the item edit form at `/items/[id]/edit` and set the `boxId` field —
this path is unchanged and already worked for the same purpose.
