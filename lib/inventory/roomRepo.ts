import { getKv } from "@/lib/kv/client.ts";
import type { Room } from "@/lib/inventory/types.ts";

const ROOM_KEY = (id: string): Deno.KvKey => ["room", id];
const ROOM_BY_NAME_KEY = (name: string): Deno.KvKey => [
  "room-by-name",
  name.toLowerCase(),
];
const ROOM_INDEX_PREFIX = (id: string): Deno.KvKey => ["item-by-room", id];

export async function createRoom(name: string): Promise<Room> {
  const kv = await getKv();
  const nameKey = ROOM_BY_NAME_KEY(name);

  const existing = await kv.get(nameKey);
  if (existing.value !== null) {
    throw new Error(`Room '${name}' already exists`);
  }

  const id = crypto.randomUUID();
  const room: Room = { id, name, createdAt: Date.now() };

  const result = await kv.atomic()
    .check({ key: nameKey, versionstamp: null })
    .set(ROOM_KEY(id), room)
    .set(nameKey, id)
    .commit();

  if (!result.ok) {
    throw new Error(`Room '${name}' already exists`);
  }

  return room;
}

export async function findRoom(id: string): Promise<Room | null> {
  const kv = await getKv();
  const entry = await kv.get<Room>(ROOM_KEY(id));
  return entry.value;
}

export async function listRooms(): Promise<Room[]> {
  const kv = await getKv();
  const entries = kv.list<Room>({ prefix: ["room"] });
  const results: Room[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteRoom(id: string): Promise<void> {
  const kv = await getKv();

  const inUse = kv.list({ prefix: ROOM_INDEX_PREFIX(id) });
  const first = await inUse.next();
  if (!first.done) {
    throw new Error(`Room '${id}' is in use`);
  }

  const room = await findRoom(id);
  if (!room) return;

  await kv.atomic()
    .delete(ROOM_KEY(id))
    .delete(ROOM_BY_NAME_KEY(room.name))
    .commit();
}
