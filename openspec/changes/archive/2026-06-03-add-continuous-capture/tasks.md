## 1. Shared frame-resize helper

- [x] 1.1 Write a failing unit test for `resizeBlobToJpeg(blob)` in
      `tests/unit/photos/resize.test.ts`: given a synthetic Blob whose decoded
      image is 1920×1080, the result MUST be a JPEG Blob whose long edge is ≤
      1600 px.
- [x] 1.2 Extract or add `resizeBlobToJpeg(blob)` in
      `lib/photos/resizeHelper.ts` reusing the existing
      `calculateTargetDimensions`. Make the unit test pass.
- [x] 1.3 Refactor `islands/PhotoCapture.tsx` to call the shared helper so both
      islands share one resize path. Verify existing E2E for `PhotoCapture`
      still passes.

## 2. Stream-lifecycle helper

- [x] 2.1 Write a failing unit test for `stopStream(stream)` in
      `tests/unit/camera/stream.test.ts`: given a fake `MediaStream` with three
      tracks, calling `stopStream` MUST call `.stop()` on each track exactly
      once and be idempotent on a second call.
- [x] 2.2 Implement `stopStream` in `lib/camera/stream.ts`. Make the unit test
      pass.
- [x] 2.3 Write a failing unit test for `isContinuousCaptureSupported()`: MUST
      return `false` when `navigator.mediaDevices?.getUserMedia` is missing;
      `true` when present. Mock the global.
- [x] 2.4 Implement `isContinuousCaptureSupported` in `lib/camera/support.ts`.

## 3. New island skeleton (no state machine yet)

- [x] 3.1 Write a failing Deno test that imports `islands/ContinuousCapture.tsx`
      and asserts the module exports a default function component.
- [x] 3.2 Create `islands/ContinuousCapture.tsx` with: props (`boxId?`,
      `csrfToken`), a placeholder `<video playsinline muted autoplay>`, an
      activation button, and no behavior yet. Make the test pass.

## 4. Activation + viewfinder

- [x] 4.1 Write a failing unit test that mocks `navigator.mediaDevices` and
      asserts the island calls
      `getUserMedia({ video: { facingMode: { ideal:
      "environment" } } })`
      exactly once on the first activation tap, and sets the returned stream on
      `video.srcObject`.
- [x] 4.2 Implement the activation path: render shutter as "Kamera aktivieren"
      (i18n key) until permission resolves; on first tap call `getUserMedia`,
      attach the stream, swap the same control to shutter mode. Make the test
      pass.

## 5. Shutter capture → upload pipeline

- [x] 5.1 Write a failing unit test that, given a stubbed `<video>` element and
      a stubbed `canvas.toBlob`, asserts the shutter handler: (a) draws the
      video frame to a canvas sized to `videoWidth×videoHeight`, (b) downscales
      via `resizeBlobToJpeg`, (c) POSTs to `/api/photos/upload-url` with the
      CSRF token, (d) PUTs the blob to the returned R2 URL.
- [x] 5.2 Implement the shutter handler that performs (a)–(d). Make the test
      pass.

## 6. Session state machine

- [x] 6.1 Write a failing unit test for the state machine in
      `tests/unit/capture/state.test.ts`: from `starting`, one shutter tap
      transitions to `in-progress` and triggers `create-from-photo` with the
      provided `boxId`; from `in-progress`, another shutter tap triggers
      `append-photo` for the same item id; the ✓ action returns to `starting`
      and clears the thumbnail strip; the ✕ action transitions to `closed` and
      stops the stream.
- [x] 6.2 Implement the state machine inside `ContinuousCapture.tsx` (signals
      for `state`, `itemId`, `thumbnails`). Make the unit test pass.
- [x] 6.3 Wire shutter taps to call `/api/items/create-from-photo` or
      `/api/items/append-photo` based on current state. Verify with an
      integration test that uses an in-memory KV and asserts that three shutter
      taps followed by ✓ followed by two shutter taps creates exactly two items,
      with three and two photos respectively.

## 7. Stream lifecycle hooks

- [x] 7.1 Write a failing unit test that mounts the island, simulates each exit
      path (✕ tap, unmount, `visibilitychange → hidden`, `pagehide`,
      `beforeunload`), and asserts `stopStream` was called for each.
- [x] 7.2 Implement the exit-path handlers funneling through a single
      `stopStream(streamRef.current)` call. Make the tests pass.

## 8. Fallback path

- [x] 8.1 Write a failing unit test asserting that when
      `isContinuousCaptureSupported()` returns `false`, the parent renders
      `<PhotoCapture>` (the existing island) with the same `boxId` and
      `csrfToken` props.
- [x] 8.2 Write a failing unit test asserting that when `getUserMedia` rejects
      with `NotAllowedError` on the activation tap, the island swaps inline to
      `<PhotoCapture>` without a page reload and shows a German hint message
      keyed via `t()`.
- [x] 8.3 Write a failing unit test asserting the same fallback behavior on
      `NotFoundError`.
- [x] 8.4 Implement the feature-detect parent component
      `components/CaptureSurface.tsx` that decides between `<ContinuousCapture>`
      and `<PhotoCapture>`. Make the support-check test pass.
- [x] 8.5 Implement inline fallback inside `ContinuousCapture.tsx` for
      `NotAllowedError` / `NotFoundError`. Make those tests pass.

## 9. i18n keys

- [x] 9.1 Add new German strings to `lib/i18n/locales/de.ts` for:
      `capture.activate`, `capture.shutterLabel`, `capture.confirmLabel`,
      `capture.closeLabel`, `capture.permissionDeniedHint`,
      `capture.noCameraHint`, `capture.unsupportedHint`.
- [x] 9.2 Replace every inline string in `ContinuousCapture.tsx` and
      `CaptureSurface.tsx` with `t()` calls. Lint check passes.

## 10. Wire into existing entry points

- [x] 10.1 Update `routes/items/new.tsx` to render `<CaptureSurface>` in place
      of the current direct `<PhotoCapture>` mount. No box id passed.
- [x] 10.2 Update `routes/boxes/[id].tsx` to render
      `<CaptureSurface
      boxId={...}>` for the capture entry, ensuring the
      box id flows to every created item.
- [x] 10.3 Update the mobile footer quick-capture control to navigate to / mount
      a `<CaptureSurface>` (no box id).
- [x] 10.4 Manually verify each entry point in a desktop Chrome session.

## 11. Playwright E2E (WebKit-specific)

- [x] 11.1 Add a Playwright config slice that runs the new spec on the WebKit
      project specifically, granting `camera` permission via
      `browserContext.grantPermissions(['camera'])`.
- [x] 11.2 Write a failing E2E test `tests/e2e/continuous-capture.spec.ts`: log
      in, navigate to the create-item route, tap activation, tap shutter three
      times, tap ✓, tap shutter twice, tap ✕, then navigate to the items list
      and assert two new items exist with three and two photos respectively.
- [x] 11.3 Write a failing E2E test for the permission-denied fallback that
      revokes `camera` from the context, taps activation, and asserts the
      file-input fallback control is rendered.
- [x] 11.4 Make both E2E tests pass.

## 13. Post-launch bugfix: item list refresh after capture

- [x] 13.1 Track whether any item was created during the capture session
      (`hadCaptures` signal); reload the page in `handleClose()` when true. Add
      requirement and scenarios to the delta spec.

## 12. Finalise

- [x] 12.1 Run `deno fmt`, `deno lint`, `deno check **/*.ts **/*.tsx`,
      `deno task test`, and the new WebKit E2E slice. All green.
- [x] 12.2 Update affected specs and run
      `openspec validate
      add-continuous-capture --strict`.
- [x] 12.3 Playwright E2E verification of the full multi-item session flow from
      §11 on the WebKit project, confirming the change's user-visible behavior
      end-to-end.
