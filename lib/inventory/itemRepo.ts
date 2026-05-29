import { getKv } from "@/lib/kv/client.ts";
import type { Item } from "@/lib/inventory/types.ts";

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

export interface CreateItemInput {
  name: string;
  categoryId: string;
  roomId: string | null;
  estimatedValue: number | null;
}

export interface UpdateItemInput {
  name?: string;
  categoryId?: string;
  roomId?: string | null;
  estimatedValue?: number | null;
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const kv = await getKv();
  const id = crypto.randomUUID();
  const now = Date.now();
  const item: Item = {
    id,
    name: input.name,
    categoryId: input.categoryId,
    roomId: input.roomId,
    estimatedValue: input.estimatedValue,
    photoKey: null,
    status: "confirmed",
    createdAt: now,
    updatedAt: now,
  };

  const op = kv.atomic()
    .set(ITEM_KEY(id), item)
    .set(CAT_IDX_KEY(item.categoryId, id), true);

  if (item.roomId) {
    op.set(ROOM_IDX_KEY(item.roomId, id), true);
  }

  await op.commit();
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
  const prefix = ["item-by-category", categoryId];
  const index = kv.list<true>({ prefix });
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
  const prefix = ["item-by-room", roomId];
  const index = kv.list<true>({ prefix });
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

  const updated: Item = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    ),
    updatedAt: Date.now(),
  };

  const op = kv.atomic().set(ITEM_KEY(id), updated);

  // Category index: remove old, add new if changed
  if (
    input.categoryId !== undefined && input.categoryId !== existing.categoryId
  ) {
    op.delete(CAT_IDX_KEY(existing.categoryId, id));
    op.set(CAT_IDX_KEY(updated.categoryId, id), true);
  }

  // Room index: remove old, add new (or remove only if cleared)
  if (input.roomId !== undefined && input.roomId !== existing.roomId) {
    if (existing.roomId) op.delete(ROOM_IDX_KEY(existing.roomId, id));
    if (updated.roomId) op.set(ROOM_IDX_KEY(updated.roomId, id), true);
  }

  await op.commit();
  return updated;
}

export async function deleteItem(id: string): Promise<void> {
  const kv = await getKv();
  const item = await findItem(id);
  if (!item) return;

  const op = kv.atomic()
    .delete(ITEM_KEY(id))
    .delete(CAT_IDX_KEY(item.categoryId, id));

  if (item.roomId) {
    op.delete(ROOM_IDX_KEY(item.roomId, id));
  }

  await op.commit();
}
