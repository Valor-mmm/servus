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
  const done = useSignal(false);

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    // Reset input so the same file can be selected again on error
    input.value = "";

    busy.value = true;
    error.value = null;

    try {
      // Validate type before resize
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
      if (mode === "create") {
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
      } else {
        // append mode — itemId is required
        const appendResp = await fetch("/api/items/append-photo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ itemId, photoKey: key }),
        });
        if (!appendResp.ok) {
          error.value = t("items.captureFailed");
          return;
        }
      }

      done.value = true;
      // Reload so the new item/photo appears
      globalThis.location?.reload();
    } catch {
      error.value = t("items.captureFailed");
    } finally {
      busy.value = false;
    }
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
