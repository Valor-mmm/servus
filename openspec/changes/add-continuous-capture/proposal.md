## Why

Packing for the move means photographing hundreds of items, and the current flow
opens the OS camera app on every shutter press — 3–4 taps per photo. With
hundreds of items ahead of us, that friction determines whether the system gets
used or abandoned. A persistent in-app viewfinder collapses each capture to a
single tap and keeps the rhythm of "pick up item, photograph, put in box" un-
interrupted.

## What Changes

- Introduce a continuous capture mode: a full-bleed live camera viewfinder
  driven by `navigator.mediaDevices.getUserMedia()`, with a single shutter
  button that captures a frame and uploads it immediately (no OS-camera round-
  trip).
- Add a multi-item session state machine on top of the viewfinder:
  - Shutter → append a photo to the current item-in-progress (or create the item
    from the first photo, if none yet).
  - Check mark (✓) → finalize the current item and remain in capture mode, ready
    for a new item; the previous item's thumbnails clear from the strip.
  - Close (✕) → finalize any in-progress item, stop the camera stream, and leave
    the capture view.
- Wire the continuous capture entry point into every place we expose photo
  capture today: the create-item route, the box detail page, and the mobile
  footer quick-capture.
- Keep the existing `<input type="file" capture="environment">` flow as the
  permission-denied / unsupported-browser fallback. If `getUserMedia` is
  unavailable or camera permission is refused, the user falls back to today's
  button-driven flow with no functionality loss.
- No new dependencies. The viewfinder uses standard Web APIs (`getUserMedia`,
  `<video>`, `<canvas>`) that have been stable for ~10 years.

## Capabilities

### New Capabilities

- `continuous-capture`: live in-app camera viewfinder, single-tap shutter,
  multi-item session state machine (in-progress item → finalized item → next
  item), graceful fallback to the existing file-input flow, and stream lifecycle
  (start on user gesture, stop on close / unmount / tab hidden).

### Modified Capabilities

<!-- None. The upload pipeline (presigned URL → R2 PUT → create-from-photo /
     append-photo) is reused unchanged, so the `photos` spec does not change.
     The per-item preview strip behavior covered by `capture-preview` is also
     unchanged. -->

## Impact

- **New island**: `islands/ContinuousCapture.tsx` — owns the viewfinder, the
  shutter/✓/✕ controls, the thumbnail strip, and the session state machine.
- **Existing island**: `islands/PhotoCapture.tsx` — unchanged behavior, but
  becomes the documented fallback when `getUserMedia` is unavailable or
  permission is denied.
- **Routes touched (UI only, no API contract changes)**:
  - `routes/items/new.tsx` — preferred entry into continuous mode, falls back to
    the existing capture button.
  - `routes/boxes/[id].tsx` — capture entry from a box context flows `boxId`
    into every item created in the session.
  - Mobile footer (`components/Footer*` or equivalent) — quick-capture entry
    also uses continuous mode where supported.
- **Upload pipeline**: unchanged. Same CSRF-protected `/api/photos/upload-url`,
  same R2 PUT, same `/api/items/create-from-photo` and
  `/api/items/append-
  photo`. No API additions.
- **Security posture**: unchanged. Same private R2 bucket, same presigned URL
  model. Camera permission is browser-managed; we store no permission state.
- **Dependencies**: zero added. All Web API.
- **Test surface**: new Playwright E2E for the multi-item session flow. Because
  iOS Safari is the highest-risk surface for `getUserMedia`, the new spec
  scenarios MUST be exercised on WebKit in CI.

## Non-goals

- Replacing the existing file-input flow. It stays as the fallback.
- In-app photo editing (crop, rotate, filter).
- Camera controls: flash, tap-to-focus, exposure, zoom, pinch gestures,
  switching between front/back cameras.
- Offline queueing of captures — each shutter uploads immediately, identical to
  today's behavior. If the network drops, the same error path applies.
- Permission re-prompting flows or in-app deep-link to system settings.
- Saving any state about whether the user has granted/denied camera permission
  on this device.
