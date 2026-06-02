import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";
import { resizeBlobToJpeg } from "@/lib/photos/resizeHelper.ts";
import { activateCamera } from "@/lib/capture/activationLogic.ts";
import { captureAndUpload } from "@/lib/capture/shutterLogic.ts";
import { createCleanup } from "@/lib/capture/lifecycleLogic.ts";
import { classifyGetUserMediaError } from "@/lib/capture/fallbackLogic.ts";
import { isContinuousCaptureSupported } from "@/lib/camera/support.ts";
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
  // Set to true immediately if getUserMedia is not available in this browser.
  const fallback = useSignal(!isContinuousCaptureSupported());
  const fallbackHint = useSignal<string | null>(
    !isContinuousCaptureSupported() ? t("capture.unsupportedHint") : null,
  );

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ── Exit-path cleanup ─────────────────────────────────────────────────

  const cleanup = createCleanup(streamRef, videoRef);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") cleanup();
    };
    const onPageHide = () => cleanup();
    const onBeforeUnload = () => cleanup();

    document.addEventListener("visibilitychange", onVisibility);
    globalThis.addEventListener("pagehide", onPageHide);
    globalThis.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      cleanup();
      document.removeEventListener("visibilitychange", onVisibility);
      globalThis.removeEventListener("pagehide", onPageHide);
      globalThis.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  // ── Activation / shutter handler ──────────────────────────────────────

  async function handleShutter() {
    if (busy.value) return;

    // Phase: idle → request camera permission and start stream
    if (phase.value === "idle") {
      busy.value = true;
      error.value = null;
      try {
        const stream = await activateCamera(
          navigator.mediaDevices,
          videoRef.current ?? { srcObject: null },
        );
        streamRef.current = stream;
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

    // Phase: starting or in-progress → capture frame and upload
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
          // Create new item from first photo
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
          phase.value = "in-progress";
        } else {
          // Append photo to existing item
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
    phase.value = "closed";
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
      <video
        ref={videoRef}
        playsinline
        muted
        autoplay
        class="capture-viewfinder"
      />

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
