import { createItem } from "@/lib/inventory/itemRepo.ts";
import type { Item } from "@/lib/inventory/types.ts";

export interface CreateFromPhotoInput {
  photoKey: string;
  boxId?: string | null;
}

export interface CreateFromPhotoResult {
  status: number;
  item?: Item;
  error?: string;
}

export async function handleCreateFromPhoto(
  input: unknown,
): Promise<CreateFromPhotoResult> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { status: 400, error: "invalid body" };
  }

  const { photoKey, boxId } = input as Record<string, unknown>;

  if (typeof photoKey !== "string" || !photoKey) {
    return { status: 400, error: "photoKey required" };
  }

  const resolvedBoxId = typeof boxId === "string" && boxId ? boxId : null;

  const item = await createItem({
    name: "",
    categoryId: null,
    roomId: null,
    boxId: resolvedBoxId,
    quantity: 1,
    estimatedValue: null,
    photos: [photoKey],
    status: "incomplete",
  });

  return { status: 201, item };
}
