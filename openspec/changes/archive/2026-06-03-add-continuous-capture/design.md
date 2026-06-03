## Context

Today's photo capture lives in `islands/PhotoCapture.tsx` and is driven by a
hidden `<input type="file" accept="image/*" capture="environment">`. Tapping the
visible button triggers the input, the OS camera launches, the user takes a
photo, control returns to the browser, the file is resized in a `<canvas>`,
uploaded to R2 via a presigned PUT, and linked to an item via either
`/api/items/create-from-photo` or `/api/items/append-photo`. After the first
photo in "create" mode, a preview strip appears with "Weiteres Foto" and
"Fertig" buttons; the underlying flow still launches the OS camera per shot.

This works, but every shot costs ~3–4 taps because the OS camera owns a full-
screen modal between the user and the next capture. For a move-scale workload
(hundreds of items, several photos each), that friction compounds into a real
abandonment risk.

The continuous-capture mode replaces only the _frame source_. Everything
downstream — resize, presigned URL, R2 PUT, item create/append, security posture
— is reused verbatim.

## Goals / Non-Goals

**Goals:**

- Reduce capture cost from 3–4 taps to 1 tap.
- Keep the rhythm of "pick up item, photograph, put in box" un-interrupted
  across many items in one session.
- Zero new runtime dependencies.
- Graceful fallback when `getUserMedia` is unavailable or permission is denied —
  the user is never blocked from capturing photos.
- Strict stream lifecycle: the camera is on only while the viewfinder is on
  screen and the user is interacting.

**Non-Goals:**

- Replacing the existing `PhotoCapture` island. It remains as the fallback.
- Building any camera UX beyond shutter / ✓ / ✕ — no flash, focus, exposure,
  zoom, pinch, front-camera toggle.
- In-app editing of captured frames (crop, rotate, filter).
- Offline queueing or retry semantics beyond what today's upload pipeline does.
- Storing or persisting any permission state.
- Matching the OS camera's still-photo quality (computational HDR, etc.). A
  1080p video frame is sufficient for inventory recognition.

## Decisions

### Use `navigator.mediaDevices.getUserMedia` + `<video>` + `<canvas>`

Standard, ~10-year-stable Web APIs available in every evergreen browser and iOS
Safari ≥ 11. Zero dependencies. The capture is:

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: { ideal: "environment" } },
});
videoEl.srcObject = stream;
// on shutter:
canvas.width = videoEl.videoWidth;
canvas.height = videoEl.videoHeight;
canvas.getContext("2d").drawImage(videoEl, 0, 0);
canvas.toBlob((blob) => upload(blob), "image/jpeg", 0.85);
```

**Alternatives considered:**

- _A camera library (e.g. `react-camera-pro`, `html5-camera-photo`)._ Rejected:
  none of them justify a dependency for the small API surface above, and most
  have had multiple major bumps that would violate the project's dep policy.
- _Continuing with `<input type="file" capture="environment">`._ This is what we
  have. The whole point of this change is that it's too many taps for a
  move-scale workload.
- _Wrapping the OS camera in a PWA share-target / file-picker trick._ No
  meaningful tap savings, still routes through the OS camera modal.

### A new island, alongside the existing one

`islands/ContinuousCapture.tsx` is added; `islands/PhotoCapture.tsx` stays
unchanged. The decision of _which_ island to render is made by a thin parent
that checks for support and permission at render time:

```
       entry point (route or footer)
                   │
                   ▼
           feature-detect getUserMedia
                   │
       ┌───────────┴───────────┐
       │                       │
 supported?                  no
       │                       │
       ▼                       ▼
<ContinuousCapture>     <PhotoCapture> (existing fallback)
       │
inside island:
on first shutter tap → request permission
       │
 permission denied?
       │
 swap to <PhotoCapture> inline
```

The permission prompt only fires on user gesture (the first shutter tap), which
is the form iOS Safari accepts. If denied, the island swaps itself for the
fallback button without a page reload.

**Alternatives considered:**

- _One unified island that handles both paths._ Rejected: the existing island is
  already shipping behavior with its own preview strip and append flow. Keeping
  it untouched is the lowest-risk way to preserve the fallback exactly as it
  works today. Two islands is the simpler architecture.
- _Render `<ContinuousCapture>` server-side based on a UA sniff._ Rejected: UA
  sniffing is fragile and would not handle "supported but permission denied" —
  we need a client-side decision either way.

### Session state machine

The island holds a finite session state, fully client-side. No server-side
session state is added — each shutter tap maps to one existing API call.

```
┌─────────────────────────────┐
│      starting (no item)      │ ◀──┐
└──────────────┬──────────────┘    │
               │ shutter tap       │ ✓ tap
               ▼                   │
┌─────────────────────────────┐    │
│  in-progress (item created)  │────┘
│  thumbnails: [t1, t2, ...]   │
└──────────────┬──────────────┘
         │           │
  shutter tap     ✕ tap
         │           │
         ▼           ▼
  (add photo)   ┌─────────────┐
                │   closed    │
                │ (stream off)│
                └─────────────┘
```

- **starting → in-progress** is triggered by the _first_ shutter tap of an item.
  It calls `/api/items/create-from-photo` with the captured key (and inherited
  `boxId` if present). The returned item id is held in island state.
- Subsequent shutter taps in **in-progress** call `/api/items/append-photo`.
- **✓** finalizes the current item by clearing the held item id and the
  thumbnail strip, then returns to **starting**. The camera stream is _not_
  stopped — the user continues photographing the next item.
- **✕** (and unmount, and `document.visibilitychange → hidden`) transitions to
  **closed**, which stops all stream tracks. If we are in **in-progress** at the
  time, no extra finalize step is needed because every shutter tap already
  persisted the photo; the user simply leaves.

**Alternatives considered:**

- _Hold all photos client-side and only upload on ✓._ Rejected: it would mean
  losing photos if the tab is closed mid-item, and would require a new bulk-
  upload API.
- _Server-side session id that groups items in a "capture batch"._ Rejected: no
  consumer needs that grouping yet; items already inherit `boxId`, which is the
  grouping the user actually cares about.

### Frame extraction via `canvas.drawImage(video, ...)`

Use `video.videoWidth × video.videoHeight` as the canvas size, then run the
existing `resizeAndEncode`-style downscale to ≤ 1600px on the long edge at JPEG
quality 0.85. The current `resizeAndEncode` takes a `File`; we add a sibling
`resizeBlobToJpeg(blob)` (or refactor `resizeAndEncode` to accept either) that
takes a `Blob` produced by `canvas.toBlob`. The shared math lives in
`lib/photos/resizeHelper.ts` already.

**Alternatives considered:**

- _`ImageCapture.grabFrame()` / `takePhoto()`._ Has better quality on Chrome but
  is not supported in Safari (the highest-risk surface). Not worth the
  conditional code path.
- _Skip the downscale because we're already capped at the video stream size._
  Rejected: streams can legitimately exceed 1600px on the long edge (e.g.
  1920×1080 → 1920 > 1600). Reusing the existing pipeline keeps a single
  invariant: ≤ 1600px on the long edge.

### Stream lifecycle

The stream is acquired _inside_ a user-gesture handler (the first shutter tap)
and stopped on every exit path:

- Component unmount.
- ✕ close tap.
- `document.visibilitychange` when `hidden`.
- `pagehide` event (Safari back/forward cache).
- `window.beforeunload`.

Every track on the `MediaStream` gets `.stop()` called; the `<video>` element
gets its `srcObject` cleared. This matters because some Android devices keep the
LED on or the camera reserved until tracks are explicitly stopped.

### Entry points

The continuous capture mode is wired into every existing photo-capture surface:

- `routes/items/new.tsx` — replaces the on-page capture trigger with the
  feature-detecting parent.
- `routes/boxes/[id].tsx` — the per-box capture entry uses the same parent; the
  box id flows into the island as `boxId`, which is passed to
  `/api/items/create-from-photo` for every newly created item in the session.
- Mobile footer quick-capture — same parent, no `boxId`.

In all three cases, the island is the _same component_; only the props differ.

### Internationalisation

All visible copy (tooltip on shutter, error message on permission denied,
fallback hint) goes through `t()` and ships German strings in
`lib/i18n/locales/de.ts`. The shutter, ✓, and ✕ buttons themselves are icons
with `aria-label`s sourced from `t()`.

## Risks / Trade-offs

- **[iOS Safari quirks]** `getUserMedia` on iOS Safari requires HTTPS (already
  true in prod, but local dev must use `localhost` or HTTPS), needs the
  `<video>` element to carry `playsinline muted autoplay`, and only starts from
  a user gesture. → _Mitigation_: cover these explicitly in the implementation
  tasks; gate the change on a Playwright E2E that runs on WebKit specifically.

- **[Permission UX dead-end]** A user who denies camera permission once may not
  realize the rest of the app still works; subsequent visits will see the
  fallback button silently. → _Mitigation_: when `getUserMedia` rejects with
  `NotAllowedError`, the island shows a short hint (German) explaining the
  fallback button and how to re-enable camera access in browser settings. We do
  not deep-link to system settings.

- **[Stream leaks]** Forgetting to stop tracks on an exit path leaves the camera
  LED on and may prevent other apps from using the camera. → _Mitigation_: a
  single `stopStream()` helper called from every exit path; unit-tested. The
  visibilitychange + pagehide + beforeunload + unmount handlers all funnel
  through it.

- **[Photo quality regression]** Video-frame captures lack the computational-
  photo features of the OS camera (HDR, multi-frame fusion). → _Mitigation_:
  target 1080p stream, which is more than adequate to recognize household items,
  read short labels, and identify boxes. Users who want a "real" photo can still
  use the fallback button by denying permission (sub-optimal but possible), or
  we can offer an explicit "open OS camera" link in a follow-up change if the
  quality is a problem in practice.

- **[Battery / heat]** The stream draws power while open. → _Mitigation_:
  hard-stop on visibility change; show no "auto-resume" UI. When the user
  returns to the tab, they tap shutter to reacquire.

- **[Permission-denied + new device]** A different device or browser has not
  been prompted yet; the island will request on first shutter tap. The user's
  first photo is therefore "lost" because the prompt steals the gesture. →
  _Mitigation_: on first mount, render shutter as a "Kamera aktivieren" button
  until permission resolves; once granted, the same physical button becomes the
  shutter. This converts the first tap into an explicit activation, not a lost
  shot.

## Migration Plan

There is no data migration. This is purely additive UI.

Rollout:

1. Land the change behind no flag (the project's "no feature flags in MVP"
   convention applies). The island self-feature-detects.
2. Manually verify on at least: iOS Safari (latest), Chrome on Android, desktop
   Chrome, desktop Firefox.
3. The Playwright E2E covers the supported-and-granted path on WebKit; the
   permission-denied fallback is covered by a unit test that mocks
   `navigator.mediaDevices` and a Playwright test that uses the WebKit context
   permission override to deny `camera`.

Rollback: revert the PR. The fallback island already does everything the new
island does, just less ergonomically; nothing depends on continuous mode.

## Open Questions

- Should the thumbnail strip allow tapping a thumbnail to remove that specific
  photo from the current in-progress item before ✓? The existing per-item remove
  endpoint (`/api/items/remove-photo`) supports it, so this is a small UX add —
  but it complicates the state machine. _Default for v1: no, thumbs are
  display-only. Add in a follow-up if needed during real use._

- Should ✓ also prompt for an item name / category, or is "create item from
  photo, name later" enough? _Default for v1: keep parity with today's
  create-from-photo flow — name and category are filled in later from the
  pending-items view._

- Should the mobile footer entry inherit any context (current box, last box)?
  _Default for v1: no — the footer entry is the "I'm photographing something
  loose, not in a box" path. The box detail page is the per-box entry._
