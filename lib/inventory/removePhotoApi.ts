import { findItem, updateItem } from "@/lib/inventory/itemRepo.ts";
import { deleteObject } from "@/lib/photos/r2.ts";
import type { R2Config } from "@/lib/photos/config.ts";
import type { Item } from "@/lib/inventory/types.ts";

export interface RemovePhotoResult {
  status: number;
  item?: Item;
  error?: string;
}

type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

export async function handleRemovePhoto(
  input: unknown,
  r2cfg: R2Config | null,
  fetchFn: FetchLike = fetch,
): Promise<RemovePhotoResult> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { status: 400, error: "invalid body" };
  }

  const { itemId, photoKey } = input as Record<string, unknown>;

  if (typeof itemId !== "string" || !itemId) {
    return { status: 400, error: "itemId required" };
  }
  if (typeof photoKey !== "string" || !photoKey) {
    return { status: 400, error: "photoKey required" };
  }

  const existing = await findItem(itemId);
  if (!existing) {
    return { status: 404, error: "item not found" };
  }

  const newPhotos = existing.photos.filter((k) => k !== photoKey);
  const updated = await updateItem(itemId, { photos: newPhotos });

  // Best-effort R2 delete — fire after KV commit, never block the response
  if (r2cfg) {
    deleteObject(r2cfg, photoKey, fetchFn).catch((err) => {
      console.warn(`[photos] best-effort delete failed for ${photoKey}:`, err);
    });
  }

  return { status: 200, item: updated };
}
