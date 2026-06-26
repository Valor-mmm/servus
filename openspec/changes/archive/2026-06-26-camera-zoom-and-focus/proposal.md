## Why

The current continuous capture viewfinder renders the camera stream without any
manual controls. On a phone held at arm's length to photograph a packed box or a
small item, the default field of view is frequently wrong: wide-angle lenses on
modern phones make small items look tiny, and fine text (labels, serial numbers)
is unreadable without getting close enough to trigger autofocus hunting. Two
gestures cover most cases: pinch-to-zoom for framing, and tap-to-focus for
locking onto a specific subject before pressing the shutter.

Both controls use only stable Web APIs (`MediaStreamTrack.applyConstraints`,
`MediaTrackCapabilities`, the `ImageCapture` API) with no new dependencies.
Neither control changes the upload pipeline, security posture, or session state
machine.

## What Changes

- **Pinch-to-zoom** — a two-finger pinch gesture on the `<video>` element
  adjusts the camera's optical zoom level. Where `zoom` is reported as a
  capability by `track.getCapabilities()`, the zoom is applied via
  `track.applyConstraints({ advanced: [{ zoom }] })`. On devices that do not
  expose a hardware zoom capability, the control is silently absent.
- **Zoom slider** — a horizontal range control overlaid on the viewfinder for
  one-handed use, clamped to the zoom range reported by the track. Hidden when
  zoom is unsupported.
- **Tap-to-focus** — a single tap on the `<video>` element places the focus
  point at the tapped position by issuing `applyConstraints` with
  `{ advanced: [{ focusMode: "manual", pointOfInterest: { x, y } }] }` (x, y
  normalised to 0–1). A brief visual indicator (a small animated ring) marks the
  tap point. When `focusMode` is not reported as a capability, the tap has no
  effect and the indicator is not shown.
- **Continuous focus (default)** — when the viewfinder first starts, focus mode
  is set to `"continuous"` if available, matching typical OS camera behavior.
  After a tap-to-focus, a second tap returns to continuous mode.

## Capabilities

### New Capabilities

- `camera-zoom`: pinch-to-zoom + zoom slider on the continuous capture
  viewfinder, clamped to hardware capability range, silently absent when
  unsupported.
- `camera-focus`: tap-to-focus with a visual ring indicator, toggling between
  manual and continuous focus modes. Silently absent when unsupported.

### Modified Capabilities

- `continuous-capture`: the viewfinder gains optional zoom and focus overlays.
  All existing requirements are preserved; the new overlays are additive.

## Impact

- **Island changed**: `islands/ContinuousCapture.tsx` — adds zoom and focus
  signal state, pointer-event handlers, a zoom slider, and a tap-to-focus ring.
- **New lib file**: `lib/camera/controls.ts` — capability detection and
  `applyConstraints` wrappers for zoom and focus (unit-testable without a real
  camera).
- **i18n**: two new keys — zoom slider aria-label, tap-to-focus ring aria-label.
- **CSS**: new overlay classes for zoom slider and focus ring.
- **No API changes** — zoom and focus are pure client-side; no routes, no KV, no
  server changes.
- **No new dependencies** — `ImageCapture` and `applyConstraints` are both
  standard Web APIs available in Chromium and partially in WebKit.

## Non-goals

- Flash or torch control.
- Manual exposure, white balance, or ISO.
- Front/rear camera toggle.
- Zoom on the `<video>` element via CSS scale (digital zoom). We target hardware
  zoom only; if the device doesn't have it, we don't fake it.
- Saving the zoom/focus state between sessions.
- Smooth animated interpolation of zoom level (no easing — direct constraint
  apply).
- Making the focus indicator persist after focus locks — it fades after 1.5 s.
