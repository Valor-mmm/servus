## Context

`islands/ContinuousCapture.tsx` renders a `<video>` element driven by
`getUserMedia` with `facingMode: { ideal: "environment" }`. The island has no
camera controls beyond the shutter. `MediaStreamTrack` exposes
`getCapabilities()` (Chromium, partial Safari) and `applyConstraints()` which
accept both a `zoom` value and a `focusMode` + `pointOfInterest` pair as
advanced constraints. Neither control requires a new library or a server change.

## Goals / Non-Goals

**Goals:**

- Pinch-to-zoom and a one-handed zoom slider.
- Tap-to-focus with brief visual ring feedback and toggle back to continuous
  mode on a second tap.
- Both controls are silently absent on devices/browsers that do not advertise
  the capability — no fallback UI clutter.
- Zero new dependencies. All Web API.
- Testable capability detection and constraint application in isolation.

**Non-Goals:**

- Digital (CSS-scale) zoom fallback.
- Front/rear camera toggle, torch, exposure, white balance.
- Persisting zoom or focus preference.
- Smooth zoom animations.

## Decisions

### Capability detection via `getCapabilities()`

`track.getCapabilities()` returns a `MediaTrackCapabilities` object. If it
contains a `zoom` property with `min`/`max`/`step`, zoom is supported. If
`focusMode` lists `"manual"`, tap-to-focus is supported. Both checks go into
`lib/camera/controls.ts` so they are importable and unit-testable without a DOM.

```ts
export function getZoomCapability(track: MediaStreamTrack) {
  const caps = track.getCapabilities?.() ?? {};
  if (!caps.zoom) return null;
  return {
    min: caps.zoom.min!,
    max: caps.zoom.max!,
    step: caps.zoom.step ?? 0.1,
  };
}

export function supportsFocusControl(track: MediaStreamTrack): boolean {
  const caps = track.getCapabilities?.() ?? {};
  return Array.isArray(caps.focusMode) && caps.focusMode.includes("manual");
}
```

### Zoom: pinch gesture + range slider

Pinch-to-zoom is detected via `pointermove` on two concurrent pointers. The
current pinch distance is compared to the distance when the second finger
touched down; the ratio is multiplied by the zoom at pinch-start, then clamped
to `[min, max]` and sent to `applyConstraints`.

```ts
export async function applyZoom(track: MediaStreamTrack, zoom: number) {
  await track.applyConstraints({
    advanced: [{ zoom }] as MediaTrackConstraintSet[],
  });
}
```

The range slider (`<input type="range">`) is a simpler one-handed alternative —
same `applyZoom` call, bound to the slider's `input` event.

Both controls read and write a shared `zoomLevel` signal so they stay in sync.

**Why not CSS scale?** — The spec explicitly excludes digital zoom. CSS scale
crops the rendered frame but the captured canvas frame is always
full-resolution, so the zoom would appear in the preview but not in the uploaded
photo, which is confusing.

### Focus: tap on the `<video>` element

A `pointerdown` handler on the `<video>` element (guarded to single-pointer,
non-pinch taps) computes normalised x/y:

```ts
const rect = videoEl.getBoundingClientRect();
const x = (e.clientX - rect.left) / rect.width;
const y = (e.clientY - rect.top) / rect.height;
```

If the current focus mode is already `"manual"` (a tap had been performed
earlier), a second tap resets to `"continuous"`. Otherwise:

```ts
await track.applyConstraints({
  advanced: [{ focusMode: "manual", pointOfInterest: { x, y } }],
});
```

The focus ring is an absolutely-positioned `<div>` with a CSS keyframe animation
(`scale` + `opacity`). It is rendered at the pointer position and removed after
1.5 s. It is `aria-hidden` and `pointer-events: none`.

### State additions to `ContinuousCapture.tsx`

Three new signals:

```ts
const zoomCap = useSignal<ZoomCapability | null>(null); // null = unsupported
const zoomLevel = useSignal(1);
const focusSupported = useSignal(false);
const focusRing = useSignal<{ x: number; y: number } | null>(null);
const focusMode = useSignal<"continuous" | "manual">("continuous");
```

These are initialised after the `getUserMedia` call resolves and the track is
available, inside the existing `activateCamera` path. A new helper
`initCameraControls(stream)` in `lib/camera/controls.ts` returns the capability
snapshot and sets the initial continuous focus mode.

### Pinch gesture isolation from shutter

The shutter uses `onClick`. Pinch uses two simultaneous `pointermove` events. A
`pinchActive` ref prevents `onClick` from firing when two fingers are down — the
`pointerdown` handler sets `pinchActive.current = true` when a second pointer is
detected, and resets it in `pointerup`. The `onClick` handler bails early when
`pinchActive.current`.

### CSS overlay structure

```
.continuous-capture              ← existing, position: relative
  .capture-viewfinder            ← existing <video>
  .capture-zoom-slider           ← new, absolute overlay at bottom
  .capture-focus-ring            ← new, absolute overlay, hidden by default
  .capture-preview-strip         ← existing
  .capture-controls              ← existing
```

All new classes follow the existing `capture-*` naming convention.

## Open Questions

None. Both Web APIs are available in Chromium ≥ 87 (>90% of mobile share) and
partially in WebKit iOS 16+. Graceful degradation is built in from the start.
