## Why

The in-app camera viewfinder (`getUserMedia`) we built is the wrong tool for the
job: tap-to-focus relies on `focusMode: "manual"`, which does not work
cross-browser and failed even in the owners' Chrome PWA on Android; the captured
image is a downscaled video-preview frame rather than a full-sensor still, so
quality is poor; and the viewfinder overflows the viewport and breaks on
orientation change. Both primary users are on Android, where even the
best-supported path still could not focus — so polishing the viewfinder (or
swapping in a camera library that is `getUserMedia` underneath) cannot fix the
root problem. The operating system's native camera already delivers real
autofocus, full-sensor quality, HDR, and correct orientation for free; its only
weakness — adding several photos in a row is tedious — is a UX-loop problem we
can solve. Sharp native stills also matter for the planned AI photo-scanning
feature, because sharpness survives our downscale but blur does not.

## What Changes

- **BREAKING:** Remove the in-app `getUserMedia` viewfinder entirely — the live
  `<video>` preview, on-screen shutter, hardware zoom slider, pinch-to-zoom,
  tap-to-focus, focus ring, and the camera-stream lifecycle/state machine.
- Introduce a single native-camera capture component used at every photo-capture
  entry point. It uses the OS camera via the native file input
  (`<input type="file" accept="image/*" capture="environment">`) as the image
  source. There is no live in-app preview, no zoom control, and no manual-focus
  control — the OS camera owns all of that.
- Make adding many photos in a row fast: one large, always-present "add photo"
  control; each photo uploads **optimistically in the background**; a thumbnail
  strip streams in as uploads complete; each thumbnail can be removed; a "done"
  action finishes. Frictionless for one photo, fast for many. No page reload
  between photos.
- Serve all three existing capture data-flows through this one component:
  create-from-photo (quick-add and box detail; first photo creates a pending
  item, subsequent photos append), attach-to-create-form (the manual create form
  collects photo keys for submission), and append-to-existing (the edit page).
  The presigned-upload, create-from-photo, and append-photo endpoints are reused
  unchanged.
- Keep the existing client-side resize (≤1600 px long edge, JPEG quality 0.85)
  as the single normalization step before upload.

### Non-goals

- No in-app live viewfinder, hardware zoom, or manual/tap focus in any form.
- The AI photo-scanning feature itself is out of scope; this change only ensures
  the source images are sharp enough to support it later.
- No changes to the photo upload pipeline, presigning, R2 storage, or the resize
  parameters.
- No new dependency is introduced; the native file input and the existing upload
  pipeline are sufficient.

## Capabilities

### New Capabilities

- `native-photo-capture`: Adding one or more photos to an item using the
  device's native camera (or gallery) as the source, with a fast multi-photo add
  loop — background uploads, a live thumbnail strip, per-photo removal, and a
  single shared surface wired into every capture entry point for all three
  data-flows (create-from-photo, attach-to-create-form, append-to-existing).

### Modified Capabilities

- `continuous-capture`: **Retired.** Every requirement of this capability is
  removed — the live in-app viewfinder, single-tap frame capture, multi-item
  state machine, stream lifecycle, getUserMedia fallback, permission-prompt
  handling, hardware zoom, tap-to-focus, and camera-control reset all cease to
  exist. Its still-relevant behavior (multi-photo add, box-id propagation,
  German copy, entry-point coverage) is re-expressed under
  `native-photo-capture`.
- `capture-preview`: The in-session thumbnail strip and photo count are retained
  but decoupled from the getUserMedia state machine and re-grounded on the
  native capture flow, and extended so each previewed photo can be removed
  before the session is finished.

## Impact

- **Removed code:** `islands/ContinuousCapture.tsx`; `lib/camera/*`
  (`controls.ts`, `stream.ts`, `support.ts`); `lib/capture/*`
  (`activationLogic.ts`, `shutterLogic.ts`, `lifecycleLogic.ts`,
  `fallbackLogic.ts`, `stateMachine.ts`); the viewfinder/zoom/focus CSS in
  `static/styles.css`; the `/dev/capture-test` harness if it no longer applies.
- **Reworked code:** `islands/PhotoCapture.tsx` and `islands/PhotoAttach.tsx`
  reconciled into the unified native capture island;
  `components/CaptureSurface.tsx` repointed or removed.
- **Touched routes:** `routes/items/quick-add.tsx`, `routes/boxes/[id].tsx`,
  `routes/items/new.tsx`, `routes/items/[id]/edit.tsx`.
- **Unchanged:** `/api/photos/upload-url`, `/api/items/create-from-photo`,
  `/api/items/append-photo`, `/api/items/remove-photo`, `lib/photos/*`,
  `lib/photos/resizeHelper.ts`.
- **i18n:** Obsolete viewfinder/zoom/focus keys removed from
  `lib/i18n/locales/de.ts`; any new copy added there first.
- **Tests:** Unit/integration tests for `lib/camera` and `lib/capture` removed;
  new tests for the unified capture island's add/remove/background-upload
  behavior; a Playwright E2E driving the native input via `setInputFiles` for a
  rapid multi-photo add.
