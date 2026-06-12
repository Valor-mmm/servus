import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";
import { resizeBlobToJpeg } from "@/lib/photos/resizeHelper.ts";
import { activateCamera } from "@/lib/capture/activationLogic.ts";
import { captureAndUpload } from "@/lib/capture/shutterLogic.ts";
import { createCleanup } from "@/lib/capture/lifecycleLogic.ts";
import { classifyGetUserMediaError } from "@/lib/capture/fallbackLogic.ts";
import { isContinuousCaptureSupported } from "@/lib/camera/support.ts";
import {
  applyZoom,
  createPinchHandler,
  type FocusMode,
  handleTapToFocus,
  initCameraControls,
  type ZoomCapability,
} from "@/lib/camera/controls.ts";
import PhotoCapture from "@/islands/PhotoCapture.tsx";

interface Props {
  boxId?: string | null;
  csrfToken: string;
}

// ── State machine ─────────────────────────────────────────────────────────

type Phase = "idle" | "starting" | "in-progress" | "closed";

// ── Component ─────────────────────────────────────────────────────────────

export default function ContinuousCapture({ boxId, csrfToken }: Props) {
  const phase = useSignal<Phase>("idle");
  const itemId = useSignal<string | null>(null);
  const thumbnails = useSignal<string[]>([]);
  const busy = useSignal(false);
  const error = useSignal<string | null>(null);
  const fallback = useSignal(!isContinuousCaptureSupported());
  const fallbackHint = useSignal<string | null>(
    !isContinuousCaptureSupported() ? t("capture.unsupportedHint") : null,
  );

  const hadCaptures = useSignal(false);

  // ── Zoom + focus signals ───────────────────────────────────────────────
  const zoomCap = useSignal<ZoomCapability | null>(null);
  const zoomLevel = useSignal(1);
  const focusSupported = useSignal(false);
  const focusMode = useSignal<FocusMode>("continuous");
  const focusRing = useSignal<{ x: number; y: number } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const focusRingTimerRef = useRef<number | null>(null);

  // ── Pinch handler (recreated when zoom cap changes) ────────────────────
  const pinchRef = useRef(
    createPinchHandler({
      onZoom: async (zoom) => {
        zoomLevel.value = zoom;
        const track = streamRef.current?.getVideoTracks()[0];
        if (track) await applyZoom(track, zoom);
      },
      zoomCap: { min: 1, max: 1, step: 0.1 },
      getCurrentZoom: () => zoomLevel.value,
    }),
  );

  // ── Exit-path cleanup ─────────────────────────────────────────────────

  const cleanup = createCleanup(streamRef, videoRef);

  function resetControlSignals() {
    zoomCap.value = null;
    zoomLevel.value = 1;
    focusSupported.value = false;
    focusMode.value = "continuous";
    focusRing.value = null;
    if (focusRingTimerRef.current !== null) {
      clearTimeout(focusRingTimerRef.current);
      focusRingTimerRef.current = null;
    }
  }

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        cleanup();
        resetControlSignals();
      }
    };
    const onPageHide = () => {
      cleanup();
      resetControlSignals();
    };
    const onBeforeUnload = () => {
      cleanup();
      resetControlSignals();
    };

    document.addEventListener("visibilitychange", onVisibility);
    globalThis.addEventListener("pagehide", onPageHide);
    globalThis.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      cleanup();
      resetControlSignals();
      document.removeEventListener("visibilitychange", onVisibility);
      globalThis.removeEventListener("pagehide", onPageHide);
      globalThis.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  // ── Activation / shutter handler ──────────────────────────────────────

  async function handleShutter() {
    if (busy.value) return;
    // Bail if a pinch is still active — don't fire shutter mid-gesture
    if (pinchRef.current.isPinching()) return;

    if (phase.value === "idle") {
      busy.value = true;
      error.value = null;
      try {
        const stream = await activateCamera(
          navigator.mediaDevices,
          videoRef.current ?? { srcObject: null },
        );
        streamRef.current = stream;

        // Initialise zoom + focus controls
        const controls = await initCameraControls(stream);
        zoomCap.value = controls.zoomCap;
        focusSupported.value = controls.focusSupported;
        zoomLevel.value = 1;

        // Rebuild pinch handler with real capability range
        if (controls.zoomCap) {
          pinchRef.current = createPinchHandler({
            onZoom: async (zoom) => {
              zoomLevel.value = zoom;
              const track = stream.getVideoTracks()[0];
              if (track) await applyZoom(track, zoom);
            },
            zoomCap: controls.zoomCap,
            getCurrentZoom: () => zoomLevel.value,
          });
        }

        phase.value = "starting";
      } catch (err) {
        const kind = classifyGetUserMediaError(err);
        if (kind === "not-allowed") {
          fallbackHint.value = t("capture.permissionDeniedHint");
          fallback.value = true;
        } else if (kind === "not-found") {
          fallbackHint.value = t("capture.noCameraHint");
          fallback.value = true;
        } else {
          error.value = t("capture.permissionDeniedHint");
        }
      } finally {
        busy.value = false;
      }
      return;
    }

    if (phase.value === "starting" || phase.value === "in-progress") {
      if (!videoRef.current) return;
      busy.value = true;
      error.value = null;
      try {
        const { key: photoKey, blob } = await captureAndUpload({
          videoEl: videoRef.current,
          resizeBlob: resizeBlobToJpeg,
          csrfToken,
        });
        const thumbUrl = URL.createObjectURL(blob);

        if (phase.value === "starting") {
          const resp = await fetch("/api/items/create-from-photo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": csrfToken,
            },
            body: JSON.stringify({ photoKey, boxId: boxId ?? null }),
          });
          if (!resp.ok) throw new Error(`create-from-photo:${resp.status}`);
          const data = (await resp.json()) as { item: { id: string } };
          itemId.value = data.item.id;
          thumbnails.value = [thumbUrl];
          hadCaptures.value = true;
          phase.value = "in-progress";
        } else {
          const resp = await fetch("/api/items/append-photo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": csrfToken,
            },
            body: JSON.stringify({ itemId: itemId.value, photoKey }),
          });
          if (!resp.ok) throw new Error(`append-photo:${resp.status}`);
          thumbnails.value = [...thumbnails.value, thumbUrl];
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        console.error("[ContinuousCapture] upload error", msg);
        if (msg.startsWith("upload-url:")) {
          error.value = t("items.captureFailedPresign", {
            status: msg.slice("upload-url:".length),
          });
        } else if (msg.startsWith("r2-put:")) {
          error.value = t("items.captureFailedR2", {
            status: msg.slice("r2-put:".length),
          });
        } else if (msg.startsWith("create-from-photo:")) {
          error.value = t("items.captureFailedCreate", {
            status: msg.slice("create-from-photo:".length),
          });
        } else if (msg.startsWith("append-photo:")) {
          error.value = t("items.captureFailedAppend", {
            status: msg.slice("append-photo:".length),
          });
        } else {
          error.value = t("items.captureFailed");
        }
      } finally {
        busy.value = false;
      }
    }
  }

  function handleConfirm() {
    itemId.value = null;
    thumbnails.value = [];
    phase.value = "starting";
  }

  function handleClose() {
    cleanup();
    resetControlSignals();
    phase.value = "closed";
    if (hadCaptures.value) {
      globalThis.location?.reload();
    }
  }

  // ── Zoom slider handler ────────────────────────────────────────────────

  async function handleZoomSlider(e: Event) {
    const value = parseFloat((e.target as HTMLInputElement).value);
    zoomLevel.value = value;
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) await applyZoom(track, value);
  }

  // ── Tap-to-focus handler ───────────────────────────────────────────────

  async function handleVideoPointerDown(e: PointerEvent) {
    // Capture pointer so pointerup always fires on this element, even when
    // fingers lift outside the video — prevents stale entries in the pinch map.
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // Delegate to pinch handler first
    pinchRef.current.onPointerDown(e);

    // Only handle tap-to-focus when focus is supported and not a pinch gesture
    if (!focusSupported.value) return;
    if (pinchRef.current.isPinching()) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;

    const rect = videoEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Show focus ring
    focusRing.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (focusRingTimerRef.current !== null) {
      clearTimeout(focusRingTimerRef.current);
    }
    focusRingTimerRef.current = setTimeout(() => {
      focusRing.value = null;
      focusRingTimerRef.current = null;
    }, 1500) as unknown as number;

    focusMode.value = await handleTapToFocus(track, focusMode.value, x, y);
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (fallback.value) {
    return (
      <div class="capture-surface">
        {fallbackHint.value && <p class="capture-hint">{fallbackHint.value}</p>}
        <PhotoCapture mode="create" boxId={boxId} csrfToken={csrfToken} />
      </div>
    );
  }

  if (phase.value === "closed") {
    return null;
  }

  const shutterLabel = phase.value === "idle"
    ? t("capture.activate")
    : t("capture.shutterLabel");

  return (
    <div class="continuous-capture">
      <div class="capture-viewfinder-wrap">
        <video
          ref={videoRef}
          playsinline
          muted
          autoplay
          class="capture-viewfinder"
          onPointerDown={handleVideoPointerDown}
          onPointerMove={(e) => pinchRef.current.onPointerMove(e)}
          onPointerUp={(e) => pinchRef.current.onPointerUp(e)}
          onPointerCancel={(e) => pinchRef.current.onPointerUp(e)}
        />

        {zoomCap.value !== null && (
          <input
            type="range"
            class="capture-zoom-slider"
            min={zoomCap.value.min}
            max={zoomCap.value.max}
            step={zoomCap.value.step}
            value={zoomLevel.value}
            aria-label={t("capture.zoomSliderLabel")}
            onInput={handleZoomSlider}
          />
        )}

        {focusRing.value !== null && (
          <div
            class="capture-focus-ring"
            aria-hidden="true"
            style={{
              left: `${focusRing.value.x}px`,
              top: `${focusRing.value.y}px`,
            }}
            aria-label={t("capture.focusRingLabel")}
          />
        )}
      </div>

      {thumbnails.value.length > 0 && (
        <div class="capture-preview-strip">
          {thumbnails.value.map((src, i) => (
            <img key={i} src={src} alt="" class="capture-preview-thumb" />
          ))}
        </div>
      )}

      <div class="capture-controls">
        <button
          type="button"
          class={`btn-primary capture-shutter${busy.value ? " disabled" : ""}`}
          aria-label={shutterLabel}
          onClick={handleShutter}
          disabled={busy.value}
        >
          {busy.value ? "…" : shutterLabel}
        </button>

        {phase.value === "in-progress" && (
          <>
            <button
              type="button"
              class="btn-secondary capture-confirm"
              aria-label={t("capture.confirmLabel")}
              onClick={handleConfirm}
              disabled={busy.value}
            >
              {t("capture.confirmLabel")}
            </button>
            <button
              type="button"
              class="btn-secondary capture-close"
              aria-label={t("capture.closeLabel")}
              onClick={handleClose}
              disabled={busy.value}
            >
              {t("capture.closeLabel")}
            </button>
          </>
        )}

        {phase.value === "starting" && (
          <button
            type="button"
            class="btn-secondary capture-close"
            aria-label={t("capture.closeLabel")}
            onClick={handleClose}
            disabled={busy.value}
          >
            {t("capture.closeLabel")}
          </button>
        )}
      </div>

      {error.value && <p class="capture-error">{error.value}</p>}
    </div>
  );
}
