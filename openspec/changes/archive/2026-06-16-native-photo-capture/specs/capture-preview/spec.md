## MODIFIED Requirements

### Requirement: Captured photos are previewed inline during multi-photo session

As soon as a photo is captured, the capture surface MUST display it in a
horizontal strip of thumbnails representing every photo in the current session,
including photos whose upload is still in progress. Thumbnails MUST be rendered
from in-memory blob URLs (no additional network requests) and MUST appear in the
order the photos were captured. The strip MUST NOT be tied to item creation — it
appears from the first capture, regardless of which data-flow mode is active.

#### Scenario: First photo shows one thumbnail in the strip

- **WHEN** a user captures the first photo of a session
- **THEN** a thumbnail strip containing exactly one image is visible, even
  before its upload has completed

#### Scenario: Each additional photo adds a thumbnail

- **WHEN** a user captures a second (or subsequent) photo in the same session
- **THEN** the thumbnail strip grows by one image, showing all photos captured
  so far in the order they were taken

#### Scenario: Strip is not visible before any photo is captured

- **WHEN** the capture surface is in its initial state with no photos captured
- **THEN** no thumbnail strip is rendered

### Requirement: Photo count is shown next to the "add another" button

The capture surface MUST display the number of photos captured in the current
session alongside the add-photo control's label once at least one photo has been
captured. The count MUST update as photos are added or removed.

#### Scenario: Count reflects photos taken so far

- **WHEN** the user has captured N photos in the session
- **THEN** the add-photo control's label shows the count N

#### Scenario: Count is not shown before first capture

- **WHEN** the capture surface is in its initial state with no photos captured
- **THEN** no count is shown next to the add-photo control label

## ADDED Requirements

### Requirement: Each previewed photo can be removed before finishing

The capture surface MUST let the user remove any photo from the thumbnail strip
before the session is finished, updating the strip and the count immediately. A
photo already linked to an item MUST be unlinked via the remove-photo endpoint;
a photo only collected for a not-yet-submitted create form MUST have its key
dropped so it is not submitted. What happens when the **last** photo is removed
depends on the mode:

- **attach-to-form** (create form): only the key is dropped; any name/category
  the user already entered remains, and the item is created on submit.
- **append-to-existing** (edit): the item is kept even with zero photos, because
  it already holds other data (name, category, etc.).
- **create-from-photo** (quick-add, box detail): the item was created from the
  first photo alone and has no other fields, so removing the last photo MUST
  delete that pending item; a later capture creates a fresh item.

#### Scenario: Removing a photo updates the strip and count

- **WHEN** the user removes a photo from the thumbnail strip
- **THEN** the thumbnail disappears, the count decreases by one, and the
  remaining photos are unaffected

#### Scenario: Removing a linked photo unlinks it from the item

- **WHEN** the user removes a photo that was already uploaded and linked to an
  item
- **THEN** the photo is unlinked from the item via the remove-photo endpoint

#### Scenario: Removing a form-collected photo drops its key

- **WHEN** the user removes a photo in attach-to-form mode before submitting the
  create form
- **THEN** that photo's key is dropped and is not submitted with the form

#### Scenario: Removing the last photo in quick-add deletes the pending item

- **WHEN** the user removes the only remaining photo of an item created in
  create-from-photo mode
- **THEN** that pending item is deleted and no blank item is left behind

#### Scenario: Removing the last photo in edit keeps the item

- **WHEN** the user removes the only remaining photo of an existing item in
  append-to-existing mode
- **THEN** the item is kept with its other data and zero photos
