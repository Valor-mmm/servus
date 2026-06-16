import { getKv } from "@/lib/kv/client.ts";
import type { Group, Item } from "@/lib/inventory/types.ts";
import { findItem } from "@/lib/inventory/itemRepo.ts";

// A Gruppe is a free-form, many-to-many set of items. Membership is stored
// two-way, mirroring the item-by-category index, so both a group's members and
// an item's groups list cheaply. Each mutation writes both sides atomically.

const GROUP_KEY = (id: string): Deno.KvKey => ["group", id];
const GROUP_BY_NAME_KEY = (name: string): Deno.KvKey => [
  "group-by-name",
  name.toLowerCase(),
];
// group → its members (ordered); value carries the sort position.
const GROUP_ITEM_KEY = (groupId: string, itemId: string): Deno.KvKey => [
  "group-item",
  groupId,
  itemId,
];
// item → its groups.
const ITEM_GROUP_KEY = (itemId: string, groupId: string): Deno.KvKey => [
  "item-group",
  itemId,
  groupId,
];

interface Membership {
  position: number;
}

// ── Group CRUD ──────────────────────────────────────────────────────────────

export async function createGroup(
  name: string,
  note: string | null = null,
): Promise<Group> {
  const trimmed = name.trim();
  if (trimmed === "") throw new Error("Group name must not be empty");

  const kv = await getKv();
  const nameKey = GROUP_BY_NAME_KEY(trimmed);
  const existing = await kv.get(nameKey);
  if (existing.value !== null) {
    throw new Error(`Group '${trimmed}' already exists`);
  }

  const now = Date.now();
  const id = crypto.randomUUID();
  const group: Group = {
    id,
    name: trimmed,
    note,
    createdAt: now,
    updatedAt: now,
  };

  const result = await kv.atomic()
    .check({ key: nameKey, versionstamp: null })
    .set(GROUP_KEY(id), group)
    .set(nameKey, id)
    .commit();
  if (!result.ok) throw new Error(`Group '${trimmed}' already exists`);

  return group;
}

export async function findGroup(id: string): Promise<Group | null> {
  const kv = await getKv();
  const entry = await kv.get<Group>(GROUP_KEY(id));
  return entry.value;
}

export async function findGroupByName(name: string): Promise<Group | null> {
  const kv = await getKv();
  const idEntry = await kv.get<string>(GROUP_BY_NAME_KEY(name.trim()));
  if (!idEntry.value) return null;
  return findGroup(idEntry.value);
}

export async function listGroups(): Promise<Group[]> {
  const kv = await getKv();
  const entries = kv.list<Group>({ prefix: ["group"] });
  const out: Group[] = [];
  for await (const e of entries) out.push(e.value);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function renameGroup(id: string, name: string): Promise<Group> {
  const trimmed = name.trim();
  if (trimmed === "") throw new Error("Group name must not be empty");

  const existing = await findGroup(id);
  if (!existing) throw new Error(`Group '${id}' not found`);

  const kv = await getKv();
  const renamed = trimmed.toLowerCase() !== existing.name.toLowerCase();
  if (renamed) {
    const clash = await kv.get(GROUP_BY_NAME_KEY(trimmed));
    if (clash.value !== null) {
      throw new Error(`Group '${trimmed}' already exists`);
    }
  }

  const updated: Group = { ...existing, name: trimmed, updatedAt: Date.now() };
  const op = kv.atomic().set(GROUP_KEY(id), updated);
  if (renamed) {
    op.check({ key: GROUP_BY_NAME_KEY(trimmed), versionstamp: null })
      .delete(GROUP_BY_NAME_KEY(existing.name))
      .set(GROUP_BY_NAME_KEY(trimmed), id);
  }
  const result = await op.commit();
  if (!result.ok) throw new Error(`Group '${trimmed}' already exists`);

  return updated;
}

export async function setNote(id: string, note: string | null): Promise<Group> {
  const existing = await findGroup(id);
  if (!existing) throw new Error(`Group '${id}' not found`);
  const kv = await getKv();
  const updated: Group = {
    ...existing,
    note: note && note.trim() !== "" ? note.trim() : null,
    updatedAt: Date.now(),
  };
  await kv.set(GROUP_KEY(id), updated);
  return updated;
}

/** Look up a group by name (case-insensitive); create it if it does not exist. */
export async function findOrCreateGroup(name: string): Promise<Group> {
  const existing = await findGroupByName(name);
  return existing ?? createGroup(name);
}

export async function deleteGroup(id: string): Promise<void> {
  const group = await findGroup(id);
  if (!group) return;

  const kv = await getKv();
  // Remove every membership (both index sides), then the group + name key.
  for await (
    const e of kv.list<Membership>({ prefix: ["group-item", id] })
  ) {
    const itemId = e.key[2] as string;
    await kv.atomic()
      .delete(GROUP_ITEM_KEY(id, itemId))
      .delete(ITEM_GROUP_KEY(itemId, id))
      .commit();
  }
  await kv.atomic()
    .delete(GROUP_KEY(id))
    .delete(GROUP_BY_NAME_KEY(group.name))
    .commit();
}

// ── Membership ──────────────────────────────────────────────────────────────

async function nextPosition(groupId: string): Promise<number> {
  const kv = await getKv();
  let max = -1;
  for await (
    const e of kv.list<Membership>({ prefix: ["group-item", groupId] })
  ) {
    if (e.value.position > max) max = e.value.position;
  }
  return max + 1;
}

/** Add an item to a group. Idempotent; appends to the end on first add. */
export async function addMembership(
  groupId: string,
  itemId: string,
): Promise<void> {
  const kv = await getKv();
  const existing = await kv.get<Membership>(GROUP_ITEM_KEY(groupId, itemId));
  if (existing.value !== null) return; // already a member

  const position = await nextPosition(groupId);
  await kv.atomic()
    .set(GROUP_ITEM_KEY(groupId, itemId), { position })
    .set(ITEM_GROUP_KEY(itemId, groupId), true)
    .commit();
}

export async function removeMembership(
  groupId: string,
  itemId: string,
): Promise<void> {
  const kv = await getKv();
  await kv.atomic()
    .delete(GROUP_ITEM_KEY(groupId, itemId))
    .delete(ITEM_GROUP_KEY(itemId, groupId))
    .commit();
}

/** The group's member items, ordered by stored position. */
export async function listMembers(groupId: string): Promise<Item[]> {
  const kv = await getKv();
  const rows: { itemId: string; position: number }[] = [];
  for await (
    const e of kv.list<Membership>({ prefix: ["group-item", groupId] })
  ) {
    rows.push({ itemId: e.key[2] as string, position: e.value.position });
  }
  rows.sort((a, b) => a.position - b.position);

  const items: Item[] = [];
  for (const row of rows) {
    const item = await findItem(row.itemId);
    if (item) items.push(item);
  }
  return items;
}

/** Number of members in a group (counts index keys; does not load items). */
export async function countMembers(groupId: string): Promise<number> {
  const kv = await getKv();
  let n = 0;
  for await (const _ of kv.list({ prefix: ["group-item", groupId] })) n++;
  return n;
}

/** The groups an item belongs to (sorted by name). */
export async function listItemGroups(itemId: string): Promise<Group[]> {
  const kv = await getKv();
  const groups: Group[] = [];
  for await (
    const e of kv.list<true>({ prefix: ["item-group", itemId] })
  ) {
    const groupId = e.key[2] as string;
    const group = await findGroup(groupId);
    if (group) groups.push(group);
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

/** Rewrite member positions to match the given item-id order. */
export async function reorderMembers(
  groupId: string,
  orderedItemIds: string[],
): Promise<void> {
  const kv = await getKv();
  let position = 0;
  for (const itemId of orderedItemIds) {
    const existing = await kv.get<Membership>(GROUP_ITEM_KEY(groupId, itemId));
    if (existing.value === null) continue; // ignore items not in the group
    await kv.set(GROUP_ITEM_KEY(groupId, itemId), { position });
    position++;
  }
}

// The item-side cascade (clearing an item's memberships on delete) is inlined in
// itemRepo.deleteItem to avoid an itemRepo↔groupRepo import cycle.
