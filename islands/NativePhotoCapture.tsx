import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";
import { resizeBlobToJpeg } from "@/lib/photos/resizeHelper.ts";
import {
  type CapturedPhoto,
  type CaptureMode,
  type CaptureUploadDeps,
  CaptureUploadSession,
} from "@/lib/inventory/captureUpload.ts";

interface Props {
  mode: CaptureMode;
  boxId?: string | null;
  itemId?: string;
  csrfToken: string;
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024;

type CaptureStep =
  | "wrong-type"
  | "too-large"
  | "presign"
  | "put"
  | "create"
  | "append"
  | "remove";

class CaptureStepError extends Error {
  step: CaptureStep;
  constructor(step: CaptureStep, detail?: string) {
    super(detail ?? step);
    this.step = step;
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof CaptureStepError) {
    switch (err.step) {
      case "wrong-type":
        return t("items.captureWrongType");
      case "too-large":
        return t("items.captureTooLarge");
      case "presign":
        return t("items.captureFailedPresign", { status: err.message });
      case "put":
        return t("items.captureFailedR2", { status: err.message });
      case "create":
        return t("items.captureFailedCreate", { status: err.message });
      case "append":
        return t("items.captureFailedAppend", { status: err.message });
      case "remove":
        return t("items.removePhotoFailed");
    }
  }
  return t("items.captureFailed");
}

function buildDeps(csrfToken: string): CaptureUploadDeps {
  const jsonHeaders = {
    "Content-Type": "application/json",
    "x-csrf-token": csrfToken,
  };
  return {
    async resize(blob) {
      if (!ALLOWED_TYPES.has(blob.type)) {
        throw new CaptureStepError("wrong-type");
      }
      const resized = await resizeBlobToJpeg(blob);
      if (resized.size > MAX_BYTES) {
        throw new CaptureStepError("too-large");
      }
      return resized;
    },
    async getUploadUrl(blob) {
      const resp = await fetch("/api/photos/upload-url", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ contentType: "image/jpeg", bytes: blob.size }),
      });
      if (!resp.ok) throw new CaptureStepError("presign", String(resp.status));
      return (await resp.json()) as { key: string; url: string };
    },
    async putToStorage(url, blob) {
      const resp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!resp.ok) throw new CaptureStepError("put", String(resp.status));
    },
    async createItem(photoKey, boxId) {
      const resp = await fetch("/api/items/create-from-photo", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ photoKey, boxId }),
      });
      if (!resp.ok) throw new CaptureStepError("create", String(resp.status));
      const data = (await resp.json()) as { item: { id: string } };
      return { id: data.item.id };
    },
    async appendPhoto(itemId, photoKey) {
      const resp = await fetch("/api/items/append-photo", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ itemId, photoKey }),
      });
      if (!resp.ok) throw new CaptureStepError("append", String(resp.status));
    },
    async removePhoto(itemId, photoKey, deleteIfEmpty) {
      const resp = await fetch("/api/items/remove-photo", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ itemId, photoKey, deleteIfEmpty }),
      });
      if (!resp.ok) throw new CaptureStepError("remove", String(resp.status));
      const data = (await resp.json()) as { deleted?: boolean };
      return { deleted: Boolean(data.deleted) };
    },
  };
}

export default function NativePhotoCapture(
  { mode, boxId, itemId, csrfToken }: Props,
) {
  const photos = useSignal<CapturedPhoto[]>([]);
  const previews = useSignal<Record<string, string>>({});
  const bannerError = useSignal<string | null>(null);

  const sessionRef = useRef<CaptureUploadSession | null>(null);
  if (!sessionRef.current) {
    sessionRef.current = new CaptureUploadSession(
      { mode, boxId, itemId },
      buildDeps(csrfToken),
      (snapshot) => {
        photos.value = snapshot;
      },
    );
  }
  const session = sessionRef.current;

  useEffect(() => {
    return () => {
      for (const url of Object.values(previews.value)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      const previewUrl = URL.createObjectURL(file);
      const { id } = session.addPhoto(file);
      previews.value = { ...previews.value, [id]: previewUrl };
    }
  }

  async function handleRemove(id: string) {
    try {
      await session.removeEntry(id);
      const url = previews.value[id];
      if (url) URL.revokeObjectURL(url);
      const next = { ...previews.value };
      delete next[id];
      previews.value = next;
    } catch {
      bannerError.value = t("items.removePhotoFailed");
    }
  }

  function handleFinish() {
    if (photos.value.some((p) => p.status === "done")) {
      globalThis.location?.reload();
    }
  }

  const count = photos.value.length;

  return (
    <div class="photo-capture">
      {photos.value.length > 0 && (
        <div class="capture-preview-strip">
          {photos.value.map((p) => (
            <div
              key={p.id}
              class={`capture-preview-item capture-preview-item--${p.status}`}
            >
              <img
                src={previews.value[p.id]}
                alt=""
                class="capture-preview-thumb"
              />
              {p.status !== "uploading" && (
                <button
                  type="button"
                  class="capture-preview-remove"
                  onClick={() => handleRemove(p.id)}
                  aria-label={t("items.removePhoto")}
                >
                  ×
                </button>
              )}
              {p.status === "failed" && (
                <button
                  type="button"
                  class="capture-preview-retry"
                  onClick={() => session.retryEntry(p.id)}
                >
                  {t("items.retry")}
                </button>
              )}
              {mode === "attach-to-form" && p.status === "done" && p.key && (
                <input type="hidden" name="photoKey" value={p.key} />
              )}
            </div>
          ))}
        </div>
      )}

      <div class="capture-controls">
        <label class="btn-primary capture-btn">
          <span>
            {t("items.addPhoto")}
            {count > 0 ? ` (${count})` : ""}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style="display:none"
            onChange={(e) => {
              const input = e.target as HTMLInputElement;
              handleFiles(input.files);
              input.value = "";
            }}
          />
        </label>
        <label class="btn-secondary capture-gallery-btn">
          <span>{t("items.fromGallery")}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            style="display:none"
            onChange={(e) => {
              const input = e.target as HTMLInputElement;
              handleFiles(input.files);
              input.value = "";
            }}
          />
        </label>
      </div>

      {mode !== "attach-to-form" &&
        photos.value.some((p) => p.status === "done") && (
        <button type="button" class="btn-secondary" onClick={handleFinish}>
          {t("items.captureFinished")}
        </button>
      )}

      {photos.value.filter((p) => p.status === "failed").map((p) => (
        <p key={p.id} class="capture-error">{errorMessage(p.error)}</p>
      ))}
      {bannerError.value && <p class="capture-error">{bannerError.value}</p>}
    </div>
  );
}
