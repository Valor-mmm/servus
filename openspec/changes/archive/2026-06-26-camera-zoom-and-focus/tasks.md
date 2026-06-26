## 1. Camera controls helper

- [x] 1.1 Write failing unit tests for `getZoomCapability(track)` in
      `tests/unit/camera/controls.test.ts`: MUST return `null` when
      `getCapabilities()` is absent or has no `zoom` property; MUST return
      `{ min, max, step }` when the capability is present.
- [x] 1.2 Write failing unit tests for `supportsFocusControl(track)`: MUST
      return `false` when `focusMode` capability is absent or does not include
      `"manual"`; MUST return `true` when `"manual"` is listed.
- [x] 1.3 Write failing unit tests for `applyZoom(track, zoom)`: MUST call
      `track.applyConstraints({ advanced: [{ zoom }] })` with the given value.
- [x] 1.4 Write failing unit tests for `applyFocus(track, x, y)`: MUST call
      `track.applyConstraints({ advanced: [{ focusMode: "manual",
      pointOfInterest: { x, y } }] })`.
- [x] 1.5 Write failing unit tests for `applyContinuousFocus(track)`: MUST call
      `track.applyConstraints({ advanced: [{ focusMode: "continuous" }] })`.
- [x] 1.6 Implement `getZoomCapability`, `supportsFocusControl`, `applyZoom`,
      `applyFocus`, `applyContinuousFocus`, and `initCameraControls(stream)` in
      `lib/camera/controls.ts`. All unit tests pass.

## 2. i18n keys

- [x] 2.1 Add German strings to `lib/i18n/locales/de.ts` for:
      `capture.zoomSliderLabel` (zoom slider aria-label),
      `capture.focusRingLabel` (focus ring aria-label).

## 3. Zoom slider in the viewfinder

- [x] 3.1 Write a failing unit test that mocks the stream/track with a zoom
      capability and asserts that after `initCameraControls`, `zoomCap` is set
      to the correct range object and `zoomLevel` starts at `1`.
- [x] 3.2 Extend `ContinuousCapture.tsx` with `zoomCap`, `zoomLevel` signals.
      After the `activateCamera` call, call `initCameraControls` and populate
      signals. Make unit test pass.
- [x] 3.3 Render a `<input type="range" class="capture-zoom-slider">` overlaid
      on the viewfinder when `zoomCap.value !== null`. Range min/max/step come
      from `zoomCap.value`; value bound to `zoomLevel.value`. On `input` event
      call `applyZoom(track, value)` and update `zoomLevel`.
- [x] 3.4 Style `.capture-zoom-slider` in `static/styles.css`: absolute position
      at the bottom of the viewfinder, full width, semi-transparent.

## 4. Pinch-to-zoom gesture

- [x] 4.1 Write failing unit tests for
      `createPinchHandler({ onZoom, zoomCap,
      getCurrentZoom })`: given two
      sequential `pointermove` events with increasing finger distance, MUST call
      `onZoom` with a clamped zoom value; given a single pointer, MUST NOT call
      `onZoom`.
- [x] 4.2 Implement `createPinchHandler` in `lib/camera/controls.ts`. Make unit
      tests pass.
- [x] 4.3 Wire `createPinchHandler` into `ContinuousCapture.tsx`: attach
      `onPointerDown`, `onPointerMove`, `onPointerUp` to the `<video>` element.
      Set `pinchActive` ref to block the shutter `onClick` during a pinch.

## 5. Tap-to-focus

- [x] 5.1 Write a failing unit test for the tap-to-focus handler: given a
      `pointerdown` event on the video element with `focusSupported = true` and
      `focusMode = "continuous"`, MUST call `applyFocus(track, x, y)` with
      normalised coordinates and set `focusMode` to `"manual"`; given a second
      tap with `focusMode = "manual"`, MUST call `applyContinuousFocus(track)`
      and reset `focusMode` to `"continuous"`.
- [x] 5.2 Add `focusSupported`, `focusMode`, `focusRing` signals to
      `ContinuousCapture.tsx`. Attach `onPointerDown` handler to `<video>` that
      runs tap-to-focus logic (skipped when pinch is active or
      `focusSupported.value` is `false`).
- [x] 5.3 Render a `.capture-focus-ring` `<div>` at the tap coordinates when
      `focusRing.value !== null`. The div is `aria-hidden`, has
      `pointer-events:
      none`, and is removed after 1.5 s via a
      `setTimeout`.
- [x] 5.4 Style `.capture-focus-ring` in `static/styles.css`: small circle,
      white 2px border, CSS keyframe fading from scale 1.4 to 1.0 with opacity 1
      → 0 over 1.5 s.

## 6. Stream initialisation integration

- [x] 6.1 Write an integration test that starts `activateCamera` with a mocked
      `getUserMedia` returning a stream whose track exposes zoom and focusMode
      capabilities, and asserts that after the call: `zoomCap` reflects the
      capability range, `zoomLevel` is 1, `focusSupported` is true, and
      `applyContinuousFocus` was called once.
- [x] 6.2 Hook `initCameraControls` call into `handleShutter`'s idle phase after
      the stream is assigned to `streamRef.current`. Make integration test pass.

## 7. Cleanup on stream stop

- [x] 7.1 Write a failing unit test that after `cleanup()` is called, `zoomCap`
      is reset to `null`, `focusSupported` is `false`, and `focusRing` is
      `null`.
- [x] 7.2 Reset zoom/focus signals inside the existing `cleanup` function in
      `lib/capture/lifecycleLogic.ts` (or equivalent). Make test pass.

## 8. Playwright E2E

- [x] 8.1 Write a failing E2E test `tests/e2e/camera-controls.spec.ts` on the
      Chromium project (Chromium exposes zoom capability in Playwright's fake
      camera stream): log in, navigate to the create-item route, activate the
      camera, assert the zoom slider is visible, interact with the slider and
      assert `zoomLevel` signal updates.
- [x] 8.2 Write a failing E2E test for tap-to-focus: tap the `<video>` element,
      assert the `.capture-focus-ring` element appears and then disappears after
      ~1.5 s.
- [x] 8.3 Make both E2E tests pass. (requires port 8000 free — runs in CI)

## 9. Finalise

- [x] 9.1 Run `deno fmt`, `deno lint`, `deno check **/*.ts **/*.tsx`,
      `deno task test`. All green.
- [x] 9.2 Update `openspec/specs/continuous-capture/spec.md` to add requirements
      and scenarios for zoom and focus controls.
- [x] 9.3 Playwright E2E verification of the full zoom + tap-to-focus flow on
      Chromium, confirming the change's user-visible behavior end-to-end.
