export interface ZoomCapability {
  min: number;
  max: number;
  step: number;
}

export interface CameraControlsState {
  zoomCap: ZoomCapability | null;
  focusSupported: boolean;
}

type TrackWithCapabilities = MediaStreamTrack & {
  getCapabilities?: () => MediaTrackCapabilities & Record<string, unknown>;
};

export function getZoomCapability(
  track: MediaStreamTrack,
): ZoomCapability | null {
  const caps = (track as TrackWithCapabilities).getCapabilities?.() ??
    ({} as Record<string, unknown>);
  const zoom = (caps as Record<string, unknown>)["zoom"] as
    | { min?: number; max?: number; step?: number }
    | undefined;
  if (!zoom || zoom.min === undefined || zoom.max === undefined) return null;
  return { min: zoom.min, max: zoom.max, step: zoom.step ?? 0.1 };
}

export function supportsFocusControl(track: MediaStreamTrack): boolean {
  const caps = (track as TrackWithCapabilities).getCapabilities?.() ??
    ({} as Record<string, unknown>);
  const modes = (caps as Record<string, unknown>)["focusMode"];
  return Array.isArray(modes) && (modes as string[]).includes("manual");
}

export async function applyZoom(
  track: MediaStreamTrack,
  zoom: number,
): Promise<void> {
  await track.applyConstraints({
    advanced: [{ zoom } as MediaTrackConstraintSet],
  });
}

export async function applyFocus(
  track: MediaStreamTrack,
  x: number,
  y: number,
): Promise<void> {
  await track.applyConstraints({
    advanced: [
      {
        focusMode: "manual",
        pointOfInterest: { x, y },
      } as unknown as MediaTrackConstraintSet,
    ],
  });
}

export async function applyContinuousFocus(
  track: MediaStreamTrack,
): Promise<void> {
  await track.applyConstraints({
    advanced: [
      { focusMode: "continuous" } as unknown as MediaTrackConstraintSet,
    ],
  });
}

export interface PinchHandler {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  isPinching: () => boolean;
}

interface PinchHandlerOptions {
  onZoom: (zoom: number) => void;
  zoomCap: ZoomCapability;
  getCurrentZoom: () => number;
}

/**
 * Creates a pinch-to-zoom pointer event handler.
 * Tracks two concurrent pointers; on move, computes the distance ratio vs the
 * initial pinch distance and scales the current zoom accordingly.
 */
export function createPinchHandler(
  opts: PinchHandlerOptions,
): PinchHandler {
  const pointers = new Map<number, { x: number; y: number }>();
  let startDistance = 0;
  let startZoom = 1;

  function distance(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onPointerDown(e: PointerEvent) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      startDistance = distance(a, b);
      startZoom = opts.getCurrentZoom();
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size < 2 || startDistance === 0) return;
    const [a, b] = [...pointers.values()];
    const currentDist = distance(a, b);
    const ratio = currentDist / startDistance;
    const rawZoom = startZoom * ratio;
    const clamped = Math.min(
      opts.zoomCap.max,
      Math.max(opts.zoomCap.min, rawZoom),
    );
    opts.onZoom(clamped);
  }

  function onPointerUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      startDistance = 0;
    }
  }

  function isPinching(): boolean {
    return pointers.size >= 2;
  }

  return { onPointerDown, onPointerMove, onPointerUp, isPinching };
}

export type FocusMode = "continuous" | "manual";

/**
 * Pure helper for tap-to-focus logic.
 * Returns the new focus mode after the tap.
 * Caller is responsible for calling applyFocus / applyContinuousFocus.
 */
export async function handleTapToFocus(
  track: MediaStreamTrack,
  currentMode: FocusMode,
  normalisedX: number,
  normalisedY: number,
): Promise<FocusMode> {
  if (currentMode === "manual") {
    await applyContinuousFocus(track);
    return "continuous";
  } else {
    await applyFocus(track, normalisedX, normalisedY);
    return "manual";
  }
}

/**
 * Reads capabilities from the first video track and optionally sets continuous
 * focus as the default focus mode. Returns the capability snapshot.
 */
export async function initCameraControls(
  stream: MediaStream,
): Promise<CameraControlsState> {
  const tracks = stream.getVideoTracks();
  if (tracks.length === 0) return { zoomCap: null, focusSupported: false };
  const track = tracks[0];
  const zoomCap = getZoomCapability(track);
  const focusSupported = supportsFocusControl(track);
  if (focusSupported) {
    try {
      await applyContinuousFocus(track);
    } catch {
      // Best-effort; not all devices honour this immediately after stream start.
    }
  }
  return { zoomCap, focusSupported };
}

export interface CameraControlSignals {
  zoomCap: unknown;
  zoomLevel: number;
  focusSupported: boolean;
  focusMode: string;
  focusRing: unknown;
}

/** Resets zoom and focus signal state to initial values after stream stop. */
export function resetCameraControlSignals(
  signals: CameraControlSignals,
): void {
  signals.zoomCap = null;
  signals.zoomLevel = 1;
  signals.focusSupported = false;
  signals.focusMode = "continuous";
  signals.focusRing = null;
}
