## ADDED Requirements

### Requirement: Consolidated placement picker on item edit form

The item edit form MUST present placement as a single "Standort" section with a
segmented control choosing between Raum, Karton, and Behälter. Only the selected
sub-picker is visible. Setting a placement via the form MUST clear the other two
placement fields.

#### Scenario: Only one placement field visible

- **WHEN** a user opens the item edit form
- **THEN** only the currently active placement type's sub-picker is shown; the
  other two are hidden

#### Scenario: Switching placement type clears others

- **WHEN** a user saves the item form with Standort = Karton
- **THEN** `roomId` and `containerId` are cleared; only `boxId` is set

---

### Requirement: Destination-side bulk packing on box detail

The `/boxes/[id]` detail page MUST provide an "Einpacken" section that lists
unassigned items (no box assigned) with checkboxes, and a submit action that
assigns all selected items to this box.

#### Scenario: Einpacken assigns selected items to box

- **WHEN** a user selects one or more unassigned items and submits the Einpacken
  form on a box detail page
- **THEN** all selected items have their `boxId` set to this box, and the box
  status recalculates
