import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";
import { resizeBlobToJpeg } from "@/lib/photos/resizeHelper.ts";

interface Props {
  csrfToken: string;
}

/**
 * Upload photos for an item that does not exist yet (the manual create form).
 * Each photo is resized, uploaded to R2 via a presigned URL, and its key kept in
 * a hidden `photoKey` input so the create handler can attach it to the new item.
 */
export default function PhotoAttach({ csrfToken }: Props) {
  const busy = useSignal(false);
  const error = useSignal<string | null>(null);
  const keys = useSignal<string[]>([]);
  const previews = useSignal<string[]>([]);

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
      const blob = await resizeBlobToJpeg(file);
      if (blob.size > 4 * 1024 * 1024) {
        error.value = t("items.captureTooLarge");
        return;
      }

      const urlResp = await fetch("/api/photos/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ contentType: "image/jpeg", bytes: blob.size }),
      });
      if (!urlResp.ok) {
        error.value = t("items.captureFailedPresign", {
          status: String(urlResp.status),
        });
        return;
      }
      const { key, url } = (await urlResp.json()) as {
        key: string;
        url: string;
      };

      const putResp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!putResp.ok) {
        error.value = t("items.captureFailedR2", {
          status: String(putResp.status),
        });
        return;
      }

      keys.value = [...keys.value, key];
      previews.value = [...previews.value, URL.createObjectURL(blob)];
    } catch {
      error.value = t("items.captureFailed");
    } finally {
      busy.value = false;
    }
  }

  return (
    <div class="photo-attach">
      {previews.value.length > 0 && (
        <div class="photo-attach-strip">
          {previews.value.map((src, i) => (
            <img key={i} src={src} alt="" class="photo-attach-thumb" />
          ))}
        </div>
      )}
      {keys.value.map((k) => (
        <input key={k} type="hidden" name="photoKey" value={k} />
      ))}
      <label
        class={`btn-secondary photo-attach-btn${busy.value ? " disabled" : ""}`}
      >
        <span>
          {busy.value
            ? "…"
            : `${t("items.captureButton")}${
              keys.value.length > 0 ? ` (${keys.value.length})` : ""
            }`}
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          style="display:none"
          disabled={busy.value}
          onChange={handleFileChange}
        />
      </label>
      {error.value && <p class="photo-attach-error">{error.value}</p>}
    </div>
  );
}
