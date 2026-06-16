## ADDED Requirements

### Requirement: Native OS camera is the capture source

The system MUST source captured photos from the device's native camera (or
gallery) via a file input configured with `accept="image/*"` and
`capture="environment"`. The system MUST NOT render a live in-app camera preview
and MUST NOT call `navigator.mediaDevices.getUserMedia`. No in-app zoom, manual
focus, or tap-to-focus control is presented; the operating system camera owns
focus, exposure, zoom, and orientation.

#### Scenario: Add control opens the OS camera

- **WHEN** the user activates the add-photo control on the capture surface
- **THEN** the device's native camera (environment-facing) is invoked through
  the file input and no in-app `<video>` preview is shown

#### Scenario: No in-app camera APIs are used

- **WHEN** the capture surface is mounted
- **THEN** no live video preview element is rendered and no `getUserMedia`,
  zoom, or focus controls are present

### Requirement: Camera is the one-tap default; gallery is a secondary path

The primary add-photo control MUST open the camera directly with a single
activation and MUST NOT present a camera-or-gallery chooser (its file input uses
`capture="environment"`). The surface MUST also offer a separate, secondary
control for choosing existing photos from the gallery, whose file input omits
`capture` and sets `multiple` so several gallery photos can be selected at once.
Both controls MUST feed the same upload loop and thumbnail strip.

#### Scenario: Primary control goes straight to the camera

- **WHEN** the user activates the primary add-photo control
- **THEN** the camera opens directly with no camera-or-gallery chooser

#### Scenario: Gallery control allows multi-select

- **WHEN** the user activates the secondary gallery control and selects three
  existing photos
- **THEN** all three are added to the session and uploaded through the same loop

### Requirement: Each photo is normalized through the existing upload pipeline

Every captured photo MUST be downscaled to at most 1600 pixels on its long edge,
re-encoded as JPEG at quality 0.85, and uploaded via the existing presigned-PUT
pipeline (`/api/photos/upload-url` then a direct PUT to object storage). The
system MUST reject a file whose type is not an accepted image type and MUST
reject a normalized photo that still exceeds the configured size limit,
surfacing a German error message in both cases.

#### Scenario: Captured photo is bounded in size

- **WHEN** the user captures a photo from a camera producing an image larger
  than 1600 pixels on its long edge
- **THEN** the uploaded JPEG measures at most 1600 pixels on its long edge

#### Scenario: Non-image file is rejected

- **WHEN** a selected file is not an accepted image type
- **THEN** the photo is not uploaded and a German error message is shown

### Requirement: Fast multi-photo add loop with background uploads

The system MUST let the user add multiple photos in succession without waiting
for prior uploads to finish and without a page reload between photos. The
add-photo control MUST remain available while uploads are in flight. Each upload
MUST proceed in the background, and the user MUST be able to start the next
capture immediately.

#### Scenario: Next photo can be added before the previous upload finishes

- **WHEN** the user captures a photo and its upload is still in progress
- **THEN** the add-photo control is still available and the user can capture
  another photo without waiting or reloading the page

#### Scenario: No reload occurs between photos

- **WHEN** the user captures several photos in one session
- **THEN** the page does not reload between captures and all captured photos
  remain represented on the surface

### Requirement: Per-photo upload status and recovery

The system MUST reflect each photo's upload state (in-progress, succeeded, or
failed) on the capture surface. A failed upload MUST NOT abort the session or
affect other photos, and the user MUST be able to remove or retry the failed
photo.

#### Scenario: One failed upload does not break the session

- **WHEN** one photo's upload fails while others succeed
- **THEN** the failed photo is marked as failed, the successful photos remain,
  and the user can continue adding more photos

#### Scenario: Failed photo can be removed or retried

- **WHEN** a photo upload has failed
- **THEN** the user can remove it or retry it without leaving the surface

### Requirement: Three capture data-flows share one surface

The system MUST drive all photo-capture data-flows through a single capture
component selected by an explicit mode:

- **create-from-photo**: the first successfully uploaded photo creates a new
  item via `/api/items/create-from-photo`, inheriting any `boxId` from the entry
  point; every subsequent photo is linked to that same item via
  `/api/items/append-photo`.
- **attach-to-form**: no item exists yet; each uploaded photo's key is held in a
  hidden `photoKey` form field to be submitted with the create form.
- **append-to-existing**: an existing item id is provided and every uploaded
  photo is linked to it via `/api/items/append-photo`.

In create-from-photo mode, the system MUST ensure that rapid successive captures
create at most one item: appends MUST wait for the create to resolve before
linking.

#### Scenario: First photo creates an item, the rest append

- **WHEN** the user captures two photos in create-from-photo mode
- **THEN** the first creates a new item and the second is appended to that same
  item

#### Scenario: Fast double capture does not create two items

- **WHEN** the user captures a second photo before the create request for the
  first photo has resolved
- **THEN** only one item is created and the second photo is appended to it

#### Scenario: Create-form mode collects keys for submission

- **WHEN** the user captures photos in attach-to-form mode and submits the
  create form
- **THEN** the captured photo keys are submitted with the form and linked to the
  newly created item

#### Scenario: Edit mode appends to the existing item

- **WHEN** the user captures a photo in append-to-existing mode
- **THEN** the photo is linked to the provided item via the append-photo
  endpoint

### Requirement: Box context propagates to every item created in a session

A create-from-photo session entered with a `boxId` MUST create every item in
that session with that same `boxId`.

#### Scenario: Box id applies to all items in the session

- **WHEN** the user enters the surface from a box detail page that supplied a
  `boxId` and creates several items in a row
- **THEN** all of those items are created with that same `boxId`

### Requirement: Finishing a session reflects the new photos

The system MUST refresh the relevant server-rendered view when a
create-from-photo or append-to-existing session is finished after at least one
successful upload, so the new item(s) or photo(s) are visible. Finishing without
any successful upload MUST NOT trigger a reload. In attach-to-form mode no
separate finish step is required; the collected keys are submitted with the
form.

#### Scenario: Finish after captures refreshes the view

- **WHEN** the user creates at least one item via create-from-photo and finishes
- **THEN** the view refreshes and the new item(s) are visible

#### Scenario: Finish without captures does not reload

- **WHEN** the user opens the surface, captures nothing, and finishes
- **THEN** no page reload occurs

### Requirement: Capture surface is wired into every entry point

The system MUST render the native capture surface at every photo-capture entry
point, including at minimum: the quick-add route, the box detail page (passing
its `boxId`), the manual create-item form, and the item edit page.

#### Scenario: Quick-add uses the native capture surface

- **WHEN** the user navigates to the quick-add route
- **THEN** the native capture surface is rendered in create-from-photo mode with
  no box id

#### Scenario: Box detail passes its box id

- **WHEN** the user starts a capture from a box detail page
- **THEN** the native capture surface opens in create-from-photo mode and every
  item created in the session carries that box's id

#### Scenario: Edit page uses append mode

- **WHEN** the user opens the capture surface from an item's edit page
- **THEN** the surface operates in append-to-existing mode for that item

### Requirement: All user-visible copy is German via the i18n helper

Every user-visible string on the capture surface MUST come from the project's
i18n helper, with German values in the project locale file. The component MUST
NOT contain inline German or English literal strings. This covers the add-photo
label and count, the finish label, the remove/retry labels, and every error
message.

#### Scenario: New copy is added to the German locale

- **WHEN** the change introduces user-visible strings for the capture surface
- **THEN** those strings are added as keys in `lib/i18n/locales/de.ts` and
  referenced via `t(key)` with no inline literals in the component
