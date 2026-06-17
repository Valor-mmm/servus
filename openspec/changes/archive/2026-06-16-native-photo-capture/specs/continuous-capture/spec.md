## REMOVED Requirements

### Requirement: Live in-app viewfinder uses the device camera

**Reason**: The in-app `getUserMedia` viewfinder is retired; capture now uses
the native OS camera with no live in-app preview. **Migration**: See
`native-photo-capture` — "Native OS camera is the capture source".

### Requirement: Single shutter tap captures and uploads a frame

**Reason**: There is no in-app shutter or video frame; photos come from the OS
camera and are uploaded through the same pipeline. **Migration**: See
`native-photo-capture` — "Each photo is normalized through the existing upload
pipeline".

### Requirement: Multi-item session state machine

**Reason**: The getUserMedia stream/state machine is removed; multi-item capture
is now a native add loop with background uploads. **Migration**: See
`native-photo-capture` — "Fast multi-photo add loop with background uploads" and
"Three capture data-flows share one surface".

### Requirement: Stream lifecycle stops the camera on every exit path

**Reason**: No persistent `MediaStream` is held, so there is no stream to stop;
the OS camera is released by the operating system after each capture.
**Migration**: None required — the threat of a leaked camera handle no longer
applies because the app never holds a camera stream.

### Requirement: Graceful fallback when continuous capture is unavailable

**Reason**: The native file-input path is now the only path, so there is nothing
to fall back from. **Migration**: See `native-photo-capture` — "Native OS camera
is the capture source".

### Requirement: Permission prompt does not consume the first shot

**Reason**: The app no longer requests camera permission via `getUserMedia`; the
OS camera handles its own permissions per capture. **Migration**: None required
— there is no activation-vs-shutter distinction.

### Requirement: Continuous capture is wired into every existing capture entry point

**Reason**: Entry-point coverage is preserved but now points at the native
capture surface. **Migration**: See `native-photo-capture` — "Capture surface is
wired into every entry point".

### Requirement: Captured items appear in the list after closing the capture surface

**Reason**: The finish-refresh behavior is preserved under the native flow.
**Migration**: See `native-photo-capture` — "Finishing a session reflects the
new photos".

### Requirement: All user-visible copy is German via the i18n helper

**Reason**: The German-copy requirement is preserved for the native capture
surface. **Migration**: See `native-photo-capture` — "All user-visible copy is
German via the i18n helper".

### Requirement: Optical zoom via hardware constraint

**Reason**: Hardware zoom via `applyConstraints` is removed; the OS camera
provides zoom during capture. **Migration**: None — zoom is handled by the
native camera app.

### Requirement: Tap-to-focus with visual ring indicator

**Reason**: Manual focus (`focusMode: "manual"`/`pointOfInterest`) did not work
cross-browser, including on the owners' Android Chrome PWA; the OS camera
provides real autofocus instead. **Migration**: None — focus is handled by the
native camera app.

### Requirement: Camera controls are reset on stream stop

**Reason**: There are no zoom/focus controls or camera stream to reset.
**Migration**: None required.
