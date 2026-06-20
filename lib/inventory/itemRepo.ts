import { getKv } from "@/lib/kv/client.ts";
import type { Item } from "@/lib/inventory/types.ts";
import { updateBoxStatus } from "@/lib/inventory/boxRepo.ts";
import { findCategory } from "@/lib/inventory/categoryRepo.ts";
import { resolveSchema } from "@/lib/inventory/schemaRepo.ts";
import {
  validateMetadata,
  validateWarrantyDate,
} from "@/lib/inventory/validateMetadata.ts";
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
const CONTAINER_IDX_KEY = (
  containerId: string,
  itemId: string,
): Deno.KvKey => ["item-by-container", containerId, itemId];
const TIME_IDX_KEY = (ts: number, itemId: string): Deno.KvKey => [
  "item-by-time",
  ts,
  itemId,
];

export interface CreateItemInput {
  name: string;
  categoryId: string | null;
  containerId?: string | null;
  roomId: string | null;
  boxId?: string | null;
  quantity?: number;
  estimatedValue: number | null;
  warrantyUntil?: string | null;
  metadata?: Record<string, unknown>;
  photos?: string[];
  status?: "incomplete" | "complete";
}

export interface UpdateItemInput {
  name?: string;
  categoryId?: string | null;
  containerId?: string | null;
  roomId?: string | null;
  boxId?: string | null;
  quantity?: number;
  estimatedValue?: number | null;
  warrantyUntil?: string | null;
  metadata?: Record<string, unknown>;
  photos?: string[];
  status?: "incomplete" | "complete";
}

function coerceQuantity(raw: unknown): number {
  const n = typeof raw === "number" ? raw : undefined;
  return n !== undefined && n >= 1 ? n : 1;
}

// Validate metadata against the schema of the given category (generic for none).
async function metadataForCategory(
  categoryId: string | null,
  raw: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const category = categoryId ? await findCategory(categoryId) : null;
  const schema = await resolveSchema(category?.schemaType ?? "generic");
  return validateMetadata(schema, raw);
}

// Verify that the candidate container item is container-capable.
async function assertContainerCapable(containerId: string): Promise<void> {
  const container = await findItem(containerId);
  if (!container) {
    throw new Error(`Container item '${containerId}' not found`);
  }
  if (!container.categoryId) {
    throw new Error(
      `Container item '${containerId}' has no category and cannot contain items`,
    );
  }
  const category = await findCategory(container.categoryId);
  if (!category?.canContain) {
    throw new Error(
      `Container item '${containerId}' belongs to a category that cannot contain items`,
    );
  }
}

// Reject if assigning containerId would create a cycle (item inside itself or
// inside one of its own descendants).
async function assertNoCycle(
  itemId: string,
  containerId: string,
): Promise<void> {
  if (itemId === containerId) {
    throw new Error(`Item '${itemId}' cannot contain itself`);
  }
  // Walk from containerId up through its ancestors; if itemId appears, it's a cycle.
  let current: Item | null = await findItem(containerId);
  while (current !== null && current.containerId !== null) {
    if (current.containerId === itemId) {
      throw new Error(
        `Assigning container '${containerId}' would create a cycle`,
      );
    }
    current = await findItem(current.containerId);
  }
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const kv = await getKv();
  const id = crypto.randomUUID();
  const now = Date.now();

  const containerId = input.containerId ?? null;
  const boxId = !containerId ? (input.boxId ?? null) : null;
  // root-owns-room: contained items always have roomId=null in storage
  const roomId = (containerId || boxId) ? null : (input.roomId ?? null);

  if (containerId) {
    await assertContainerCapable(containerId);
  }

  const warrantyUntil = validateWarrantyDate(input.warrantyUntil);
  const metadata = await metadataForCategory(
    input.categoryId,
    input.metadata ?? {},
  );

  const item: Item = {
    id,
    name: input.name,
    categoryId: input.categoryId,
    containerId,
    roomId,
    boxId,
    quantity: coerceQuantity(input.quantity),
    estimatedValue: input.estimatedValue,
    warrantyUntil,
    metadata,
    photos: input.photos ?? [],
    status: input.status ?? "complete",
    createdAt: now,
    updatedAt: now,
  };

  const op = kv.atomic().set(ITEM_KEY(id), item);

  op.set(TIME_IDX_KEY(now, id), true);
  if (item.categoryId) {
    op.set(CAT_IDX_KEY(item.categoryId, id), true);
  }
  if (item.containerId) {
    op.set(CONTAINER_IDX_KEY(item.containerId, id), true);
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
    containerId: raw.containerId ?? null,
    quantity: coerceQuantity(raw.quantity),
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    warrantyUntil: typeof raw.warrantyUntil === "string"
      ? raw.warrantyUntil
      : null,
    metadata: raw.metadata && typeof raw.metadata === "object"
      ? raw.metadata
      : {},
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

export async function listItemsByContainer(
  containerId: string,
): Promise<Item[]> {
  const kv = await getKv();
  const index = kv.list<true>({ prefix: ["item-by-container", containerId] });
  const items: Item[] = [];
  for await (const entry of index) {
    const itemId = entry.key[2] as string;
    const item = await findItem(itemId);
    if (item) items.push(item);
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

// Walk the containment chain upward and return the root item's roomId.
export async function resolveRoom(item: Item): Promise<string | null> {
  let current: Item = item;
  let depth = 0;
  while (current.containerId !== null) {
    if (++depth > 100) break; // safety guard against unexpected cycles
    const parent = await findItem(current.containerId);
    if (!parent) break;
    current = parent;
  }
  return current.roomId;
}

// Collect all descendant item IDs in the subtree rooted at containerId.
async function collectDescendants(containerId: string): Promise<Item[]> {
  const kv = await getKv();
  const results: Item[] = [];
  const queue = [containerId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for await (
      const entry of kv.list<true>({ prefix: ["item-by-container", parentId] })
    ) {
      const childId = entry.key[2] as string;
      const child = await findItem(childId);
      if (child) {
        results.push(child);
        queue.push(childId);
      }
    }
  }
  return results;
}

export async function listItemsByRoom(roomId: string): Promise<Item[]> {
  const kv = await getKv();
  const index = kv.list<true>({ prefix: ["item-by-room", roomId] });
  const directItems: Item[] = [];
  for await (const entry of index) {
    const itemId = entry.key[2] as string;
    const item = await findItem(itemId);
    if (item) directItems.push(item);
  }

  // Include all items contained (transitively) by roots in this room.
  const contained: Item[] = [];
  for (const root of directItems) {
    const descendants = await collectDescendants(root.id);
    contained.push(...descendants);
  }

  return [...directItems, ...contained].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
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

  const settingContainer = input.containerId !== undefined;
  const resolvedContainerId = settingContainer
    ? input.containerId ?? null
    : existing.containerId;

  if (resolvedContainerId && resolvedContainerId !== existing.containerId) {
    await assertContainerCapable(resolvedContainerId);
    await assertNoCycle(id, resolvedContainerId);
  }

  // Triple mutual exclusion: containerId, boxId, roomId
  let resolvedBoxId: string | null;
  let resolvedRoomId: string | null;

  if (resolvedContainerId) {
    // Contained items always have roomId=null and boxId=null
    resolvedBoxId = null;
    resolvedRoomId = null;
  } else {
    resolvedBoxId = input.boxId !== undefined ? input.boxId : existing.boxId;
    resolvedRoomId = input.roomId !== undefined
      ? input.roomId
      : existing.roomId;

    if (input.boxId !== undefined && input.boxId !== null) {
      resolvedRoomId = null;
    } else if (input.roomId !== undefined && input.roomId !== null) {
      resolvedBoxId = null;
    }
  }

  const resolvedCategoryId = input.categoryId !== undefined
    ? input.categoryId
    : existing.categoryId;

  const rawMetadata = input.metadata !== undefined
    ? input.metadata
    : existing.metadata;
  const metadata = await metadataForCategory(resolvedCategoryId, rawMetadata);

  const warrantyUntil = input.warrantyUntil !== undefined
    ? validateWarrantyDate(input.warrantyUntil)
    : existing.warrantyUntil;

  const updated: Item = {
    ...existing,
    name: input.name ?? existing.name,
    categoryId: resolvedCategoryId,
    containerId: resolvedContainerId,
    roomId: resolvedRoomId,
    boxId: resolvedBoxId,
    quantity: input.quantity !== undefined
      ? coerceQuantity(input.quantity)
      : existing.quantity,
    estimatedValue: input.estimatedValue !== undefined
      ? input.estimatedValue
      : existing.estimatedValue,
    warrantyUntil,
    metadata,
    photos: input.photos !== undefined ? input.photos : existing.photos,
    status: input.status !== undefined ? input.status : existing.status,
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

  // Container index
  if (resolvedContainerId !== existing.containerId) {
    if (existing.containerId) {
      op.delete(CONTAINER_IDX_KEY(existing.containerId, id));
    }
    if (updated.containerId) {
      op.set(CONTAINER_IDX_KEY(updated.containerId, id), true);
    }
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
  options?: { replacementRoomId?: string | null },
): Promise<void> {
  const kv = await getKv();
  const item = await findItem(id);
  if (!item) return;

  // Gather direct children before deletion so we can repoint them.
  const children = await listItemsByContainer(id);

  const op = kv.atomic().delete(ITEM_KEY(id));

  op.delete(TIME_IDX_KEY(item.createdAt, id));
  if (item.categoryId) op.delete(CAT_IDX_KEY(item.categoryId, id));
  if (item.containerId) op.delete(CONTAINER_IDX_KEY(item.containerId, id));
  if (item.roomId) op.delete(ROOM_IDX_KEY(item.roomId, id));
  if (item.boxId) op.delete(BOX_IDX_KEY(item.boxId, id));

  // Children: clear containerId and optionally set roomId — all in same atomic.
  const replacementRoomId = options?.replacementRoomId ?? null;
  for (const child of children) {
    op.delete(CONTAINER_IDX_KEY(id, child.id));
    const updatedChild: Item = {
      ...child,
      containerId: null,
      roomId: replacementRoomId,
      updatedAt: Date.now(),
    };
    op.set(ITEM_KEY(child.id), updatedChild);
    if (replacementRoomId) {
      op.set(ROOM_IDX_KEY(replacementRoomId, child.id), true);
    }
  }

  await op.commit();
  if (item.boxId) await updateBoxStatus(item.boxId);

  // Clear the item's group memberships from both index sides.
  for await (
    const e of kv.list<true>({ prefix: ["item-group", id] })
  ) {
    const groupId = e.key[2] as string;
    await kv.atomic()
      .delete(["item-group", id, groupId])
      .delete(["group-item", groupId, id])
      .commit();
  }

  // Fire R2 deletes after KV commit; failures are logged and never surface to caller
  if (r2cfg && item.photos.length > 0) {
    for (const key of item.photos) {
      deleteObject(r2cfg, key, fetchFn).catch((err) => {
        console.warn(`[photos] best-effort delete failed for ${key}:`, err);
      });
    }
  }
}
