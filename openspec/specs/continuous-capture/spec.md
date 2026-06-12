# Continuous Capture Specification

## Requirements

### Requirement: Live in-app viewfinder uses the device camera

The system MUST provide a continuous capture surface that renders a live preview
of the device's environment-facing camera inside the app, without launching the
operating system's camera application. The preview MUST be driven by
`navigator.mediaDevices.getUserMedia` with
`video.facingMode = { ideal: "environment" }` and rendered into a `<video>`
element configured for inline mobile playback (`playsinline`, `muted`,
`autoplay`).

#### Scenario: Viewfinder renders the camera stream

- **WHEN** a user with a supported browser and granted camera permission enters
  the continuous capture surface
- **THEN** a live video preview of the environment-facing camera is visible on
  screen and the user has not been routed through the OS camera app

#### Scenario: Stream is requested from a user gesture

- **WHEN** the continuous capture surface mounts on iOS Safari, and the
  permission state for `camera` is `prompt`
- **THEN** the call to `getUserMedia` is performed inside the handler for the
  user's first activation tap (not on mount), so that the iOS Safari user-
  gesture requirement is satisfied

---

### Requirement: Single shutter tap captures and uploads a frame

The system MUST allow the user to capture the current video frame with a single
tap of an on-screen shutter control. Each capture MUST be downscaled to at most
1600 pixels on the long edge, re-encoded as JPEG at quality 0.85, and uploaded
through the existing presigned-PUT upload pipeline (the same one used by the
file-input capture path). The user MUST NOT be required to leave the viewfinder
between captures.

#### Scenario: Shutter tap appends to the in-progress item

- **WHEN** the user has at least one captured photo for the current item and
  taps the shutter again
- **THEN** the new frame is uploaded and linked to the same item via the
  append-photo endpoint, and the viewfinder remains live without an OS-camera
  round-trip

#### Scenario: First shutter tap creates a new item

- **WHEN** the user taps the shutter while no item is in progress
- **THEN** the frame is uploaded and a new item is created via the
  create-from-photo endpoint, inheriting any `boxId` provided by the entry point

#### Scenario: Captured frame is bounded in size

- **WHEN** the user taps the shutter against a 1920×1080 video stream
- **THEN** the uploaded JPEG measures at most 1600 pixels on its long edge

---

### Requirement: Multi-item session state machine

The system MUST maintain a per-session state with three observable states —
`starting` (no item in progress), `in-progress` (an item exists with one or more
uploaded photos), and `closed` (the camera stream is stopped and the view is
left). Transitions MUST be:

- `starting → in-progress` on the first shutter tap of an item.
- `in-progress → in-progress` on subsequent shutter taps for the same item.
- `in-progress → starting` on the user's confirm (✓) action, which clears the
  current item id and the thumbnail strip but keeps the camera stream live.
- Any state `→ closed` on the user's close (✕) action, on component unmount, on
  `document.visibilitychange` to `hidden`, on `pagehide`, or on `beforeunload`.

#### Scenario: Confirm finalizes one item and prepares the next

- **WHEN** the user has captured two photos for an item and taps the confirm (✓)
  control
- **THEN** the current item id and the thumbnail strip are cleared, no item is
  in progress, the camera stream remains live, and the next shutter tap creates
  a new item via create-from-photo

#### Scenario: Confirm is disabled when no item is in progress

- **WHEN** the user enters the surface and has not yet captured any photo
- **THEN** the confirm (✓) control is disabled or otherwise non-interactive

#### Scenario: Box context flows to every item in the session

- **WHEN** the user enters the surface from a box detail page that supplied a
  `boxId`, and captures photos for three items in a row
- **THEN** all three items are created with that same `boxId`

---

### Requirement: Stream lifecycle stops the camera on every exit path

The system MUST stop every track on the active `MediaStream` and clear the
`<video>` element's `srcObject` on every exit from the continuous capture
surface, including: user close (✕), component unmount, page hide, tab visibility
becoming `hidden`, and `beforeunload`. The system MUST NOT keep the camera
reserved or the device indicator active after any of these events.

This mitigates the threat of a leaked camera handle revealing the user's
environment to any other process or session, and avoids the user-visible bug of
the device camera LED staying on after the user has left the surface.

#### Scenario: Close button stops the stream

- **WHEN** the user taps the close (✕) control with the stream active
- **THEN** every track on the stream has `stop()` called, the `<video>`
  element's `srcObject` is null, and the surface is exited

#### Scenario: Tab becoming hidden stops the stream

- **WHEN** the user switches to another tab or backgrounds the browser while the
  surface is open
- **THEN** every track on the stream has `stop()` called and the device camera
  indicator is no longer active

#### Scenario: Component unmount stops the stream

- **WHEN** the user navigates away from the surface using an in-app link
- **THEN** every track on the stream has `stop()` called as part of unmount and
  the camera is released before the new route mounts

---

### Requirement: Graceful fallback when continuous capture is unavailable

The system MUST detect at runtime whether `navigator.mediaDevices.getUserMedia`
is callable and whether the user has granted camera permission. When either
check fails — including but not limited to `getUserMedia` being absent, the user
denying the permission prompt, or the API rejecting with `NotAllowedError` or
`NotFoundError` — the system MUST render the existing file-input capture control
(the path that uses `<input type="file" capture="environment">`) in place of the
viewfinder, so that the user can always capture photos.

#### Scenario: API unavailable falls back

- **WHEN** the surface mounts in a browser where
  `navigator.mediaDevices?.getUserMedia` is `undefined`
- **THEN** the existing file-input-based capture control is rendered and the
  user can capture photos through the OS camera app exactly as before

#### Scenario: Permission denial falls back inline

- **WHEN** the user taps the activation control and the permission request is
  denied (`getUserMedia` rejects with `NotAllowedError`)
- **THEN** the surface swaps to the file-input-based capture control without a
  page reload, and a short hint in German explains how to re-enable camera
  access in browser settings

#### Scenario: No camera device falls back

- **WHEN** `getUserMedia` rejects with `NotFoundError` because the device has no
  usable camera
- **THEN** the surface swaps to the file-input-based capture control and the
  user is not blocked from photo capture

---

### Requirement: Permission prompt does not consume the first shot

The system MUST NOT treat the user gesture that triggers the initial permission
prompt as a shutter activation. The first user gesture before permission has
been granted MUST function as a "Kamera aktivieren" activation that requests
permission only; the same physical control acts as the shutter on subsequent
taps once permission is granted.

#### Scenario: First tap activates, second tap shoots

- **WHEN** the user enters the surface with `camera` permission in the `prompt`
  state, taps the activation control once (and grants permission in the OS
  prompt that appears), and taps again
- **THEN** the first tap performs no capture and the second tap captures and
  uploads the first frame for a new item

---

### Requirement: Continuous capture is wired into every existing capture entry point

The system MUST render the continuous capture surface from every existing
photo-capture entry point, falling back to the file-input control only when the
browser does not support continuous capture. The set of entry points MUST
include, at minimum, the create-item route, the box detail page, and the mobile
footer quick-capture control.

#### Scenario: Create-item route uses continuous capture

- **WHEN** a supported user navigates to the create-item route
- **THEN** the page renders the continuous capture surface, not the file-input
  button

#### Scenario: Box detail page uses continuous capture and propagates boxId

- **WHEN** a supported user starts a capture from a box detail page
- **THEN** the continuous capture surface opens with the page's box id applied
  to every item created during the session

#### Scenario: Mobile footer quick-capture uses continuous capture

- **WHEN** a supported user taps the footer quick-capture control on a mobile
  layout
- **THEN** the continuous capture surface opens with no box id, and items
  created in the session are not linked to any box

---

### Requirement: Captured items appear in the list after closing the capture surface

When the user closes the continuous capture surface after having created at
least one item during the session, the page MUST reload so that the
server-rendered item list reflects the newly created items. If no item was
created during the session, the surface MUST close without reloading.

#### Scenario: Close after captures triggers a page reload

- **WHEN** the user creates at least one item via the continuous capture surface
  and then taps the close (✕) control
- **THEN** the page reloads and the item list below the capture surface reflects
  the newly created items

#### Scenario: Close without captures does not reload

- **WHEN** the user opens the continuous capture surface but does not capture
  any photo and then taps the close (✕) control
- **THEN** the surface closes without a page reload

---

### Requirement: All user-visible copy is German via the i18n helper

The system MUST source every user-visible string in the continuous capture
surface from the project's i18n helper, with German values stored in the
project's locale file. The system MUST NOT contain any inline German or English
literal strings inside the island's JSX. This covers the shutter label, the
confirm label, the close label, the permission-denied hint, the no-camera hint,
and every error message.

#### Scenario: New keys are added to the German locale

- **WHEN** the change introduces user-visible strings for the continuous capture
  surface
- **THEN** all of those strings are added as new keys to
  `lib/i18n/locales/de.ts` and referenced from the island via `t(key)`

---

### Requirement: Optical zoom via hardware constraint

When the active video track reports a `zoom` capability via
`track.getCapabilities()`, the system MUST expose a range control overlaid on
the viewfinder allowing the user to adjust zoom within the hardware-reported
`[min, max]` range. The zoom level MUST be applied via
`track.applyConstraints({ advanced: [{ zoom }] })`. The control MUST NOT be
rendered when the track does not report a `zoom` capability. A pinch-to-zoom
gesture on the viewfinder MUST produce the same effect as the slider.

This requirement covers hardware (optical) zoom only. CSS-scale digital zoom is
explicitly out of scope.

> **Browser compatibility note:** `zoom` is a Chrome/Android extension to the
> W3C Media Capture spec. Firefox does not expose a `zoom` capability from
> `getCapabilities()` and does not implement the `zoom` constraint in
> `applyConstraints()`. As a result, the zoom slider and pinch-to-zoom gesture
> are unavailable in Firefox. This is the correct graceful degradation; no
> workaround is planned.

#### Scenario: Zoom slider appears when zoom capability is available

- **WHEN** the user activates the camera on a device whose video track reports a
  `zoom` capability
- **THEN** a zoom slider control is visible overlaid on the viewfinder

#### Scenario: Zoom slider is absent when zoom is unsupported

- **WHEN** the user activates the camera on a device whose video track does not
  report a `zoom` capability
- **THEN** no zoom slider is rendered

#### Scenario: Zoom slider updates the track constraint

- **WHEN** the user moves the zoom slider to a value within the reported range
- **THEN** `track.applyConstraints({ advanced: [{ zoom: <value> }] })` is called
  with the new value

#### Scenario: Pinch-out zooms in

- **WHEN** the user performs a pinch-out gesture on the viewfinder with zoom
  capability available
- **THEN** the zoom level increases and the same constraint is applied to the
  track

#### Scenario: Zoom is clamped to capability range

- **WHEN** the pinch or slider would produce a zoom value outside `[min, max]`
- **THEN** the applied value is clamped to the reported range

---

### Requirement: Tap-to-focus with visual ring indicator

When the active video track reports `"manual"` in its `focusMode` capability,
the system MUST allow the user to tap the viewfinder to set a manual focus point
at the tapped position. The system MUST issue
`track.applyConstraints({ advanced: [{ focusMode: "manual", pointOfInterest: { x, y } }] })`
with normalised coordinates. A brief animated ring indicator MUST appear at the
tap position and fade within 1.5 seconds. A second tap MUST reset focus to
`"continuous"` mode. When `"manual"` is not listed as a supported focus mode,
tapping the viewfinder has no effect.

> **Browser compatibility note:** `focusMode` and `pointOfInterest` are
> Chrome/Android extensions to the W3C Media Capture spec. Firefox does not
> include `focusMode` in `getCapabilities()` and does not implement the
> `focusMode`/`pointOfInterest` constraints. As a result, tap-to-focus is
> unavailable in Firefox. This is the correct graceful degradation; no
> workaround is planned.

#### Scenario: Tap places manual focus at the tapped position

- **WHEN** the user taps the viewfinder with focus control supported and current
  focus mode is `"continuous"`
- **THEN** `applyConstraints` is called with `focusMode: "manual"` and
  `pointOfInterest` set to the normalised tap coordinates

#### Scenario: Second tap resets to continuous focus

- **WHEN** the user taps the viewfinder a second time while `focusMode` is
  `"manual"`
- **THEN** `applyConstraints` is called with `focusMode: "continuous"` and focus
  mode returns to `"continuous"`

#### Scenario: Focus ring appears and fades

- **WHEN** the user taps the viewfinder
- **THEN** an animated ring element appears at the tap position and disappears
  within 1.5 seconds

#### Scenario: Tap has no effect when focus control is unsupported

- **WHEN** the user taps the viewfinder on a device whose track does not report
  `"manual"` in its `focusMode` capability
- **THEN** no `applyConstraints` call is made and no focus ring is shown

---

### Requirement: Camera controls are reset on stream stop

When the camera stream is stopped via any exit path (close button, tab hidden,
unmount, page hide, beforeunload), all zoom and focus overlay state MUST be
reset to initial values (`zoomCap: null`, `zoomLevel: 1`,
`focusSupported: false`, `focusMode: "continuous"`, `focusRing: null`). This
ensures that if the surface re-activates, it begins from a clean state without
stale capability data.

#### Scenario: Zoom and focus signals cleared on stream stop

- **WHEN** the user closes the continuous capture surface or the page becomes
  hidden with the stream active
- **THEN** `zoomCap` is null, `focusSupported` is false, and any visible focus
  ring is removed
