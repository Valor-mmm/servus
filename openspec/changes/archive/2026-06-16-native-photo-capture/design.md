## Context

Photo capture today is split across three islands with two different
philosophies. `ContinuousCapture` (wrapped by `CaptureSurface`) is a custom
`getUserMedia` viewfinder with our own zoom, pinch, tap-to-focus, and a
stream-lifecycle state machine (`lib/camera/*`, `lib/capture/*`); it is used by
quick-add, box detail, and the manual create form. `PhotoCapture` and
`PhotoAttach` are native file-input islands used by the edit page and the create
form respectively.

The viewfinder has proven to be the wrong foundation: manual focus
(`focusMode: "manual"` + `pointOfInterest`) is a Chrome/Android-only extension
that, in practice, did not work even on the owners' Android Chrome PWA; captured
images are downscaled video-preview frames, not full-sensor stills; and the
`<video>` element overflows the viewport and mishandles orientation. Both
primary users are on Android, so there is no platform where the viewfinder pays
off. A third-party camera library would not help — every browser camera library
is `getUserMedia` underneath and inherits the same focus and quality ceiling,
while violating the project's low-dependency constraint.

## Goals / Non-Goals

**Goals:**

- One capture island, native-camera-sourced, used at every entry point.
- Full-sensor quality and real autofocus by delegating entirely to the OS camera
  — important for the future AI photo-scanning feature, since sharpness survives
  the downscale but blur does not.
- A fast multi-photo add loop: background uploads, a streaming thumbnail strip,
  per-photo removal, no reload between photos.
- A large net deletion of camera/stream/zoom/focus code.

**Non-Goals:**

- Any in-app live preview, hardware zoom, or manual/tap focus.
- The AI scanning feature itself.
- Changes to the upload pipeline, presigning, R2, or resize parameters.
- Any new dependency.

## Decisions

### Native file input as the only capture source

Use the native file input everywhere. The OS camera owns preview, focus, zoom,
HDR, and orientation. We get a full-resolution still and then apply the existing
client resize.

- _Alternative — keep/fix the `getUserMedia` viewfinder:_ rejected. The two
  worst problems (focus, still quality) are platform limitations we cannot fix
  in the browser; the overflow bug is fixable but not worth keeping the rest.
- _Alternative — a camera library:_ rejected. Same `getUserMedia` ceiling plus a
  maintenance dependency the project explicitly avoids.
- _Trade-off:_ no in-app burst; each photo is one OS round-trip. We mitigate the
  resulting friction with the add loop below rather than with camera tech.

### Camera is the one-tap default; gallery is a secondary path

The primary add-photo control is camera-only — a file input with
`capture="environment"` so a single tap opens the camera with no chooser dialog,
which is the right behavior for ~95% of captures (photographing the item in
front of you). A separate, smaller "from gallery" control uses a second file
input **without** `capture` and **with** `multiple`, so the rare gallery case
can batch-select several existing photos at once. Both feed the same upload
loop.

- _Alternative — a single input that always shows the OS chooser
  (camera-or-gallery):_ rejected; it adds a tap to the overwhelmingly common
  camera path.

### One island, three data-flows, selected by an explicit mode

A single island accepts a `mode` describing the data-flow:

- `create-from-photo` (quick-add, box detail): the first successful upload calls
  `/api/items/create-from-photo` (inheriting an optional `boxId`) to create a
  pending item; every subsequent upload calls `/api/items/append-photo` for that
  same item. Appends are queued until the create resolves so a fast double-tap
  cannot create two items or append before the id exists.
- `attach-to-form` (manual create form): no item exists yet; each uploaded photo
  key is held in a hidden `photoKey` input and submitted with the form, exactly
  as `PhotoAttach` does today.
- `append-to-existing` (edit page): an `itemId` is provided; every upload calls
  `/api/items/append-photo`.

This keeps `PhotoCapture` and `PhotoAttach`'s responsibilities in one component
without branching UI — only the per-photo "link" step differs by mode.

### Optimistic, background uploads with per-photo status

Selecting a photo immediately adds a thumbnail in an `uploading` state (rendered
from an in-memory blob URL) and starts resize → presign → PUT → link in the
background. The add control is never disabled by an in-flight upload, so the
user can keep shooting. Each thumbnail reflects `uploading`, `done`, or
`failed`. A failed upload is removable and retryable without affecting the
others.

- _Alternative — block until each upload finishes:_ rejected; that is the
  current tedium we are trying to remove.

### Removal semantics depend on the mode (and what else the view holds)

Removing a thumbnail unlinks the photo, but what happens when the _last_ photo
is removed depends on whether the view carries any other item data:

- `attach-to-form` (create form): no item exists yet, so removal just drops the
  in-memory key and its hidden input. Any name/category the user already typed
  stays in the form; the item is created only on submit. Nothing to delete.
- `append-to-existing` (edit): the item already has a name, category, etc.
  Removing photos calls `/api/items/remove-photo`; the item is **kept** even if
  it ends with zero photos.
- `create-from-photo` (quick-add, box detail): the item was created purely from
  the first photo and has no other fields. Removing a linked photo calls
  `remove-photo`; if that removes the **last** photo, the just-created pending
  item is **deleted** (via the existing `deleteItem` path) so abandoning a shot
  leaves nothing behind. The next capture simply creates a fresh item.

`deleteItem` already exists in `lib/inventory/itemRepo.ts`; a small
authenticated endpoint (or reuse of the item-detail DELETE handler) exposes it
to the island for the quick-add case.

### Finish behavior preserved

`create-from-photo` and `append-to-existing` reload on "done" so the
server-rendered list/detail reflects new photos, matching today's behavior;
finishing with zero captured photos does not reload. `attach-to-form` needs no
finish action — the keys ride along on the normal form submit.

## Risks / Trade-offs

- **One OS round-trip per photo (no in-app burst).** → Mitigated by background
  uploads and an always-present add control, so the only wait is the OS camera
  itself; the app never blocks between shots.
- **Optimistic upload can fail after the thumbnail appears.** → Per-photo
  `failed` state with remove/retry; the create/append link step surfaces errors
  per photo rather than failing the whole session.
- **Create/append race on fast double-tap in `create-from-photo`.** → Appends
  are queued behind the single create call; only the first upload may create an
  item.
- **A pending item can end up with zero photos after removal.** → Accepted; the
  item remains editable. Acceptable for a two-user inventory.
- **Lost niche capability (hardware zoom on the rare device that had it).** →
  Accepted; the OS camera provides zoom during capture instead.

## Migration Plan

No data migration: the photo schema, keys, and upload endpoints are unchanged.
Steps: build the unified island behind the existing entry points, repoint each
route, then delete `ContinuousCapture`, `lib/camera/*`, `lib/capture/*`, the
viewfinder/zoom/focus CSS, the obsolete i18n keys, and the related unit tests.
Rollback is a straight revert of the PR; no stored data is affected.
