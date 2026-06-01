## Why

When using the multi-photo capture flow (box detail or quick-add), the user has
no feedback on how many photos they have already attached — after each capture
the "Weiteres Foto" button reappears but the captured images are invisible. On a
phone mid-packing it is impossible to tell at a glance whether the camera got
the shot or whether you already took three photos of the same object.

## What Changes

- **Inline photo strip in `PhotoCapture` island**: after the first successful
  create-from-photo, a small horizontal strip of thumbnails appears above the
  action buttons. Each captured image is shown as a `40×40 px` square (blob URL,
  no R2 round-trip). When the user adds more photos the strip grows.
- **Photo count badge**: the "Weiteres Foto" label shows a small count of photos
  already taken in this session (e.g. `Weiteres Foto (1)`), so users with small
  screens or poor lighting can tell at a glance.
- **No removal in capture flow**: removing a photo from the strip is out of
  scope — the item edit page already has per-photo remove buttons. The strip is
  read-only.

## Capabilities

### New Capabilities

- `capture-preview`: in-session thumbnail strip and photo count inside the
  `PhotoCapture` island during the multi-photo create flow.

### Modified Capabilities

_(none — no existing spec requirements change)_

## Non-goals

- Removing photos during capture (use item edit page).
- Persisting previews across page reloads.
- Showing thumbnails for photos uploaded in a previous session.
- Reordering photos during capture.

## Impact

- `islands/PhotoCapture.tsx`: new in-memory `capturedBlobs` signal; thumbnail
  `<img>` elements rendered from object URLs.
- `static/styles.css`: small additions for `.capture-preview-strip` layout.
- No API changes, no KV changes, no R2 changes.
