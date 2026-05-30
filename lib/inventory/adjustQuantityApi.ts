import { adjustQuantity } from "@/lib/inventory/itemRepo.ts";

export interface AdjustQuantityResult {
  status: number;
  quantity?: number;
  error?: string;
}

export async function handleAdjustQuantityPost(
  body: unknown,
): Promise<AdjustQuantityResult> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { status: 400, error: "invalid" };
  }

  const { itemId, delta } = body as Record<string, unknown>;

  if (typeof itemId !== "string" || !itemId) {
    return { status: 400, error: "invalid" };
  }

  if (delta !== 1 && delta !== -1) {
    return { status: 400, error: "invalid" };
  }

  const item = await adjustQuantity(itemId, delta);
  return { status: 200, quantity: item.quantity };
}
