import { getKv } from "@/lib/kv/client.ts";
import type { Item } from "@/lib/inventory/types.ts";
import { updateBoxStatus } from "@/lib/inventory/boxRepo.ts";
import { deleteObject } from "@/lib/photos/r2.ts";
import type { R2Config } from "@/lib/photos/config.ts";

type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

const ITEM_KEY = (id: string): Deno.KvKey => ["item", id];
const CAT_IDX_KEY = (catId: string, itemId: string): Deno.KvKey => [
  "item-by-category",
  catId,
  itemId,
];
const ROOM_IDX_KEY = (roomId: string, itemId: string): Deno.KvKey => [
  "item-by-room",
  roomId,
  itemId,
];
const BOX_IDX_KEY = (boxId: string, itemId: string): Deno.KvKey => [
  "item-by-box",
  boxId,
  itemId,
];
const TIME_IDX_KEY = (ts: number, itemId: string): Deno.KvKey => [
  "item-by-time",
  ts,
  itemId,
];

export interface CreateItemInput {
  name: string;
  categoryId: string | null;
  roomId: string | null;
  boxId?: string | null;
  quantity?: number;
  estimatedValue: number | null;
  photos?: string[];
  status?: "pending" | "confirmed";
}

export interface UpdateItemInput {
  name?: string;
  categoryId?: string | null;
  roomId?: string | null;
  boxId?: string | null;
  quantity?: number;
  estimatedValue?: number | null;
  photos?: string[];
}

function coerceQuantity(raw: unknown): number {
  const n = typeof raw === "number" ? raw : undefined;
  return n !== undefined && n >= 1 ? n : 1;
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const kv = await getKv();
  const id = crypto.randomUUID();
  const now = Date.now();

  // Enforce mutual exclusion: boxId and roomId cannot both be set
  const boxId = input.boxId ?? null;
  const roomId = boxId ? null : (input.roomId ?? null);

  const item: Item = {
    id,
    name: input.name,
    categoryId: input.categoryId,
    roomId,
    boxId,
    quantity: coerceQuantity(input.quantity),
    estimatedValue: input.estimatedValue,
    photos: input.photos ?? [],
    status: input.status ?? "confirmed",
    createdAt: now,
    updatedAt: now,
  };

  const op = kv.atomic().set(ITEM_KEY(id), item);

  op.set(TIME_IDX_KEY(now, id), true);
  if (item.categoryId) {
    op.set(CAT_IDX_KEY(item.categoryId, id), true);
  }
  if (item.roomId) {
    op.set(ROOM_IDX_KEY(item.roomId, id), true);
  }
  if (item.boxId) {
    op.set(BOX_IDX_KEY(item.boxId, id), true);
  }

  await op.commit();
  if (item.boxId) await updateBoxStatus(item.boxId);
  return item;
}

// deno-lint-ignore no-explicit-any
function normalizeItem(raw: any): Item {
  return {
    ...raw,
    quantity: coerceQuantity(raw.quantity),
    // Legacy records missing `photos` or carrying the old `photoKey` field
    // are coerced to an empty array at read time. No write-side migration needed.
    photos: Array.isArray(raw.photos) ? raw.photos : [],
  };
}

export async function findItem(id: string): Promise<Item | null> {
  const kv = await getKv();
  const entry = await kv.get<Item>(ITEM_KEY(id));
  return entry.value ? normalizeItem(entry.value) : null;
}

export async function listItems(): Promise<Item[]> {
  const kv = await getKv();
  const entries = kv.list<Item>({ prefix: ["item"] });
  const results: Item[] = [];
  for await (const entry of entries) {
    results.push(normalizeItem(entry.value));
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listItemsByCategory(categoryId: string): Promise<Item[]> {
  const kv = await getKv();
  const index = kv.list<true>({ prefix: ["item-by-category", categoryId] });
  const items: Item[] = [];
  for await (const entry of index) {
    const itemId = entry.key[2] as string;
    const item = await findItem(itemId);
    if (item) items.push(item);
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listItemsByRoom(roomId: string): Promise<Item[]> {
  const kv = await getKv();
  const index = kv.list<true>({ prefix: ["item-by-room", roomId] });
  const items: Item[] = [];
  for await (const entry of index) {
    const itemId = entry.key[2] as string;
    const item = await findItem(itemId);
    if (item) items.push(item);
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listItemsByBox(boxId: string): Promise<Item[]> {
  const kv = await getKv();
  const index = kv.list<true>({ prefix: ["item-by-box", boxId] });
  const items: Item[] = [];
  for await (const entry of index) {
    const itemId = entry.key[2] as string;
    const item = await findItem(itemId);
    if (item) items.push(item);
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateItem(
  id: string,
  input: UpdateItemInput,
): Promise<Item> {
  const kv = await getKv();
  const existing = await findItem(id);
  if (!existing) throw new Error(`Item '${id}' not found`);

  // Mutual exclusion: setting boxId clears roomId and vice versa
  let resolvedBoxId = input.boxId !== undefined ? input.boxId : existing.boxId;
  let resolvedRoomId = input.roomId !== undefined
    ? input.roomId
    : existing.roomId;

  if (input.boxId !== undefined && input.boxId !== null) {
    resolvedRoomId = null;
  } else if (input.roomId !== undefined && input.roomId !== null) {
    resolvedBoxId = null;
  }

  const updated: Item = {
    ...existing,
    name: input.name ?? existing.name,
    categoryId: input.categoryId !== undefined
      ? input.categoryId
      : existing.categoryId,
    roomId: resolvedRoomId,
    boxId: resolvedBoxId,
    quantity: input.quantity !== undefined
      ? coerceQuantity(input.quantity)
      : existing.quantity,
    estimatedValue: input.estimatedValue !== undefined
      ? input.estimatedValue
      : existing.estimatedValue,
    photos: input.photos !== undefined ? input.photos : existing.photos,
    updatedAt: Date.now(),
  };

  const op = kv.atomic().set(ITEM_KEY(id), updated);

  // Category index
  if (
    input.categoryId !== undefined && input.categoryId !== existing.categoryId
  ) {
    if (existing.categoryId) op.delete(CAT_IDX_KEY(existing.categoryId, id));
    if (updated.categoryId) op.set(CAT_IDX_KEY(updated.categoryId, id), true);
  }

  // Room index
  if (resolvedRoomId !== existing.roomId) {
    if (existing.roomId) op.delete(ROOM_IDX_KEY(existing.roomId, id));
    if (updated.roomId) op.set(ROOM_IDX_KEY(updated.roomId, id), true);
  }

  // Box index
  if (resolvedBoxId !== existing.boxId) {
    if (existing.boxId) op.delete(BOX_IDX_KEY(existing.boxId, id));
    if (updated.boxId) op.set(BOX_IDX_KEY(updated.boxId, id), true);
  }

  await op.commit();

  // Update box status for any affected box
  if (resolvedBoxId !== existing.boxId) {
    if (existing.boxId) await updateBoxStatus(existing.boxId);
    if (resolvedBoxId) await updateBoxStatus(resolvedBoxId);
  }

  return updated;
}

export async function listItemsRecent(limit: number): Promise<Item[]> {
  const kv = await getKv();
  const index = kv.list<true>({ prefix: ["item-by-time"] }, {
    limit,
    reverse: true,
  });
  const items: Item[] = [];
  for await (const entry of index) {
    const itemId = entry.key[2] as string;
    const item = await findItem(itemId);
    if (item) items.push(item);
  }
  return items;
}

export async function countItems(): Promise<number> {
  const kv = await getKv();
  const entries = kv.list({ prefix: ["item"] }, { consistency: "eventual" });
  let count = 0;
  for await (const _entry of entries) {
    count++;
  }
  return count;
}

export async function adjustQuantity(
  id: string,
  delta: 1 | -1,
): Promise<Item> {
  const item = await findItem(id);
  if (!item) throw new Error(`Item '${id}' not found`);
  if (delta === -1 && item.quantity <= 1) return item;
  return updateItem(id, { quantity: item.quantity + delta });
}

export async function deleteItem(
  id: string,
  r2cfg?: R2Config | null,
  fetchFn: FetchLike = fetch,
): Promise<void> {
  const kv = await getKv();
  const item = await findItem(id);
  if (!item) return;

  const op = kv.atomic().delete(ITEM_KEY(id));

  op.delete(TIME_IDX_KEY(item.createdAt, id));
  if (item.categoryId) op.delete(CAT_IDX_KEY(item.categoryId, id));
  if (item.roomId) op.delete(ROOM_IDX_KEY(item.roomId, id));
  if (item.boxId) op.delete(BOX_IDX_KEY(item.boxId, id));

  // KV commit first — orphan cleanup is best-effort and must not block deletion
  await op.commit();
  if (item.boxId) await updateBoxStatus(item.boxId);

  // Fire R2 deletes after KV commit; failures are logged and never surface to caller
  if (r2cfg && item.photos.length > 0) {
    for (const key of item.photos) {
      deleteObject(r2cfg, key, fetchFn).catch((err) => {
        console.warn(`[photos] best-effort delete failed for ${key}:`, err);
      });
    }
  }
}
