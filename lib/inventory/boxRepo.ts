import { getKv } from "@/lib/kv/client.ts";
import type { Box, BoxStatus, BoxTombstone } from "@/lib/inventory/types.ts";

const BOX_KEY = (id: string): Deno.KvKey => ["box", id];
const BOX_CODE_KEY = (code: string): Deno.KvKey => ["box-by-code", code];
const BOX_COUNTER_KEY: Deno.KvKey = ["box-code-counter"];
const ITEM_BOX_PREFIX = (boxId: string): Deno.KvKey => ["item-by-box", boxId];

export interface CreateBoxInput {
  label?: string | null;
  destinationRoomId?: string | null;
}

export interface UpdateBoxInput {
  label?: string | null;
  destinationRoomId?: string | null;
}

export interface BoxWithItemCount extends Box {
  itemCount: number;
}

async function nextCode(kv: Deno.Kv): Promise<string> {
  while (true) {
    const entry = await kv.get<number>(BOX_COUNTER_KEY);
    const current = entry.value ?? 0;
    const next = current + 1;
    const result = await kv.atomic()
      .check(entry)
      .set(BOX_COUNTER_KEY, next)
      .commit();
    if (result.ok) {
      return `B-${String(next).padStart(3, "0")}`;
    }
    // another concurrent create won the race — retry
  }
}

export async function createBox(input: CreateBoxInput): Promise<Box> {
  const kv = await getKv();
  const id = crypto.randomUUID();
  const now = Date.now();
  const code = await nextCode(kv);
  const box: Box = {
    id,
    code,
    label: input.label ?? null,
    destinationRoomId: input.destinationRoomId ?? null,
    status: "empty" as BoxStatus,
    createdAt: now,
    updatedAt: now,
  };

  await kv.atomic()
    .set(BOX_KEY(id), box)
    .set(BOX_CODE_KEY(code), id)
    .commit();

  return box;
}

export async function findBox(id: string): Promise<Box | null> {
  const kv = await getKv();
  const entry = await kv.get<Box>(BOX_KEY(id));
  return entry.value;
}

export async function findBoxByCode(code: string): Promise<Box | null> {
  const kv = await getKv();
  const idEntry = await kv.get<string>(BOX_CODE_KEY(code));
  if (!idEntry.value) return null;
  return findBox(idEntry.value);
}

export async function listBoxes(): Promise<BoxWithItemCount[]> {
  const kv = await getKv();

  // Count items per box from the index
  const itemCounts = new Map<string, number>();
  const itemIter = kv.list<true>({ prefix: ["item-by-box"] });
  for await (const entry of itemIter) {
    const boxId = entry.key[1] as string;
    itemCounts.set(boxId, (itemCounts.get(boxId) ?? 0) + 1);
  }

  const boxes: BoxWithItemCount[] = [];
  const iter = kv.list<Box>({ prefix: ["box"] });
  for await (const entry of iter) {
    boxes.push({
      ...entry.value,
      itemCount: itemCounts.get(entry.value.id) ?? 0,
    });
  }
  return boxes.sort((a, b) => a.code.localeCompare(b.code));
}

export async function updateBox(
  id: string,
  input: UpdateBoxInput,
): Promise<Box> {
  const kv = await getKv();
  const existing = await findBox(id);
  if (!existing) throw new Error(`Box '${id}' not found`);

  const updated: Box = {
    ...existing,
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.destinationRoomId !== undefined
      ? { destinationRoomId: input.destinationRoomId }
      : {}),
    updatedAt: Date.now(),
  };

  await kv.atomic().set(BOX_KEY(id), updated).commit();
  return updated;
}

export async function markBoxDelivered(id: string): Promise<void> {
  const kv = await getKv();
  const entry = await kv.get<Box>(BOX_KEY(id));
  if (!entry.value || entry.value.status !== "packed") return;
  const updated: Box = {
    ...entry.value,
    status: "delivered",
    updatedAt: Date.now(),
  };
  await kv.atomic().check(entry).set(BOX_KEY(id), updated).commit();
}

const BOX_TOMBSTONE_KEY = (id: string): Deno.KvKey => ["box-tombstone", id];

export async function updateBoxStatus(boxId: string): Promise<void> {
  const kv = await getKv();
  const entry = await kv.get<Box>(BOX_KEY(boxId));
  if (!entry.value) return;
  if (entry.value.status === "delivered") return;

  const hasItems = !(await kv.list<true>({ prefix: ITEM_BOX_PREFIX(boxId) })
    .next()).done;
  const newStatus: BoxStatus = hasItems ? "packed" : "empty";
  if (entry.value.status === newStatus) return;

  const updated: Box = {
    ...entry.value,
    status: newStatus,
    updatedAt: Date.now(),
  };
  await kv.atomic().check(entry).set(BOX_KEY(boxId), updated).commit();
}

export async function tombstoneDeleteBox(
  box: Box,
  reason: "unpacked" | "manual",
): Promise<void> {
  const kv = await getKv();
  const tombstone: BoxTombstone = {
    id: box.id,
    code: box.code,
    label: box.label,
    destinationRoomId: box.destinationRoomId,
    createdAt: box.createdAt,
    deletedAt: Date.now(),
    reason,
  };
  await kv.atomic()
    .set(BOX_TOMBSTONE_KEY(box.id), tombstone)
    .delete(BOX_KEY(box.id))
    .delete(BOX_CODE_KEY(box.code))
    .commit();
}

export async function deleteBox(id: string): Promise<void> {
  const kv = await getKv();
  const box = await findBox(id);
  if (!box) return;

  // Reject deletion if any items are assigned
  const firstItem = await kv.list<true>({ prefix: ITEM_BOX_PREFIX(id) }).next();
  if (!firstItem.done) {
    throw new Error(`Box '${id}' is not empty — remove all items first`);
  }

  await kv.atomic()
    .delete(BOX_KEY(id))
    .delete(BOX_CODE_KEY(box.code))
    .commit();
}
