import { generatePhotoKey } from "@/lib/photos/keys.ts";
import { presignPut } from "@/lib/photos/signing.ts";
import type { R2Config } from "@/lib/photos/config.ts";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_BYTES = 4 * 1024 * 1024; // 4 MiB

export interface UploadUrlResult {
  status: number;
  key?: string;
  url?: string;
  error?: string;
}

export function handleUploadUrl(
  input: unknown,
  r2cfg: R2Config,
): UploadUrlResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { status: 400, error: "invalid body" };
  }

  const { contentType, bytes } = input as Record<string, unknown>;

  if (
    typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.has(contentType)
  ) {
    return {
      status: 400,
      error: "contentType must be image/jpeg, image/png, or image/webp",
    };
  }

  if (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes <= 0) {
    return { status: 400, error: "bytes must be a positive integer" };
  }

  if (bytes > MAX_BYTES) {
    return { status: 400, error: `bytes must not exceed ${MAX_BYTES} (4 MiB)` };
  }

  const key = generatePhotoKey();
  const url = presignPut(r2cfg, key, contentType, 300);

  return { status: 200, key, url };
}
