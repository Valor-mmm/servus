import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";
import { calculateTargetDimensions } from "@/lib/photos/resizeHelper.ts";

interface Props {
  boxId?: string | null;
  /** "create" opens the camera and creates a new item; "append" adds to an existing item. */
  mode: "create" | "append";
  itemId?: string; // required when mode === "append"
  csrfToken: string;
}

const JPEG_QUALITY = 0.85;

/** Resize a captured file to ≤1600px on the long edge and re-encode as JPEG. */
export function resizeAndEncode(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = calculateTargetDimensions(
        img.naturalWidth,
        img.naturalHeight,
      );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas 2d context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("canvas.toBlob returned null"));
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function PhotoCapture(
  { boxId, mode, itemId, csrfToken }: Props,
) {
  const busy = useSignal(false);
  const error = useSignal<string | null>(null);
  // After a successful create, holds the new item's id so subsequent photos
  // append to the same item rather than creating a second one.
  const createdItemId = useSignal<string | null>(null);
  // Blob URLs of successfully uploaded photos in this session for inline preview.
  const capturedBlobs = useSignal<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";

    busy.value = true;
    error.value = null;

    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        error.value = t("items.captureWrongType");
        return;
      }

      const blob = await resizeAndEncode(file);

      if (blob.size > 4 * 1024 * 1024) {
        error.value = t("items.captureTooLarge");
        return;
      }

      // 1. Get presigned PUT URL
      const urlResp = await fetch("/api/photos/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ contentType: "image/jpeg", bytes: blob.size }),
      });

      if (!urlResp.ok) {
        error.value = t("items.captureFailed");
        return;
      }

      const { key, url } = (await urlResp.json()) as {
        key: string;
        url: string;
      };

      // 2. PUT blob directly to R2
      const putResp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });

      if (!putResp.ok) {
        error.value = t("items.captureFailed");
        return;
      }

      // 3. Link key to item
      // Use createdItemId if we already made an item this session (append more
      // photos to it); otherwise follow the mode prop.
      const existingId = createdItemId.value ?? itemId;
      if (existingId && (mode === "append" || createdItemId.value !== null)) {
        const appendResp = await fetch("/api/items/append-photo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ itemId: existingId, photoKey: key }),
        });
        if (!appendResp.ok) {
          error.value = t("items.captureFailed");
          return;
        }
        // Add preview thumbnail for this successfully uploaded photo.
        capturedBlobs.value = [
          ...capturedBlobs.value,
          URL.createObjectURL(blob),
        ];
      } else {
        // mode === "create" and no item created yet in this session
        const createResp = await fetch("/api/items/create-from-photo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ photoKey: key, boxId: boxId ?? null }),
        });
        if (!createResp.ok) {
          error.value = t("items.captureFailed");
          return;
        }
        const data = (await createResp.json()) as { item: { id: string } };
        createdItemId.value = data.item.id;
        // Add preview thumbnail for the first photo.
        capturedBlobs.value = [URL.createObjectURL(blob)];
        // Don't reload yet — show "Weiteres Foto" / "Fertig" so the user can
        // add more photos to this item before leaving the capture screen.
        return;
      }
    } catch {
      error.value = t("items.captureFailed");
    } finally {
      busy.value = false;
    }
  }

  function handleFinished() {
    globalThis.location?.reload();
  }

  // After a create-mode first photo: let user add more or finish.
  if (createdItemId.value !== null) {
    const count = capturedBlobs.value.length;
    return (
      <div class="photo-capture photo-capture--multi">
        {count > 0 && (
          <div class="capture-preview-strip">
            {capturedBlobs.value.map((src, i) => (
              <img key={i} src={src} alt="" class="capture-preview-thumb" />
            ))}
          </div>
        )}
        <label
          class={`btn-primary capture-btn${busy.value ? " disabled" : ""}`}
        >
          <span>
            {busy.value ? "…" : `${t("items.addAnotherPhoto")} (${count})`}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style="display:none"
            disabled={busy.value}
            onChange={handleFileChange}
          />
        </label>
        <button
          type="button"
          class="btn-secondary"
          onClick={handleFinished}
          disabled={busy.value}
        >
          {t("items.captureFinished")}
        </button>
        {error.value && <p class="capture-error">{error.value}</p>}
      </div>
    );
  }

  return (
    <div class="photo-capture">
      <label class={`btn-primary capture-btn${busy.value ? " disabled" : ""}`}>
        <span>{busy.value ? "…" : t("items.captureButton")}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          style="display:none"
          disabled={busy.value}
          onChange={handleFileChange}
        />
      </label>
      {error.value && <p class="capture-error">{error.value}</p>}
    </div>
  );
}
