import { findItem, updateItem } from "@/lib/inventory/itemRepo.ts";
import type { Item } from "@/lib/inventory/types.ts";

export interface AppendPhotoResult {
  status: number;
  item?: Item;
  error?: string;
}

export async function handleAppendPhoto(
  input: unknown,
): Promise<AppendPhotoResult> {
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

  const updated = await updateItem(itemId, {
    photos: [...existing.photos, photoKey],
  });

  return { status: 200, item: updated };
}
