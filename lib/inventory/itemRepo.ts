import { getKv } from "@/lib/kv/client.ts";
import type { Item } from "@/lib/inventory/types.ts";
import { updateBoxStatus } from "@/lib/inventory/boxRepo.ts";

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

export interface CreateItemInput {
  name: string;
  categoryId: string | null;
  roomId: string | null;
  boxId?: string | null;
  estimatedValue: number | null;
}

export interface UpdateItemInput {
  name?: string;
  categoryId?: string | null;
  roomId?: string | null;
  boxId?: string | null;
  estimatedValue?: number | null;
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
    estimatedValue: input.estimatedValue,
    photoKey: null,
    status: "confirmed",
    createdAt: now,
    updatedAt: now,
  };

  const op = kv.atomic().set(ITEM_KEY(id), item);

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

export async function findItem(id: string): Promise<Item | null> {
  const kv = await getKv();
  const entry = await kv.get<Item>(ITEM_KEY(id));
  return entry.value;
}

export async function listItems(): Promise<Item[]> {
  const kv = await getKv();
  const entries = kv.list<Item>({ prefix: ["item"] });
  const results: Item[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
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
    estimatedValue: input.estimatedValue !== undefined
      ? input.estimatedValue
      : existing.estimatedValue,
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

export async function deleteItem(id: string): Promise<void> {
  const kv = await getKv();
  const item = await findItem(id);
  if (!item) return;

  const op = kv.atomic().delete(ITEM_KEY(id));

  if (item.categoryId) op.delete(CAT_IDX_KEY(item.categoryId, id));
  if (item.roomId) op.delete(ROOM_IDX_KEY(item.roomId, id));
  if (item.boxId) op.delete(BOX_IDX_KEY(item.boxId, id));

  await op.commit();
  if (item.boxId) await updateBoxStatus(item.boxId);
}
