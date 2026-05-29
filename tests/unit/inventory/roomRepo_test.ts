import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  createRoom,
  deleteRoom,
  findRoom,
  listRooms,
} from "@/lib/inventory/roomRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("createRoom returns a room with generated id", async () => {
  await withKv(async () => {
    const room = await createRoom("Küche");
    assertExists(room.id);
    assertEquals(room.name, "Küche");
    assertEquals(typeof room.createdAt, "number");
  });
});

Deno.test("findRoom returns null for unknown id", async () => {
  await withKv(async () => {
    const room = await findRoom("nonexistent");
    assertEquals(room, null);
  });
});

Deno.test("findRoom returns created room", async () => {
  await withKv(async () => {
    const created = await createRoom("Schlafzimmer");
    const found = await findRoom(created.id);
    assertExists(found);
    assertEquals(found.name, "Schlafzimmer");
  });
});

Deno.test("listRooms returns all rooms", async () => {
  await withKv(async () => {
    await createRoom("Wohnzimmer");
    await createRoom("Keller");
    const list = await listRooms();
    assertEquals(list.length, 2);
  });
});

Deno.test("createRoom rejects duplicate name (case-insensitive)", async () => {
  await withKv(async () => {
    await createRoom("Garage");
    await assertRejects(
      () => createRoom("garage"),
      Error,
      "already exists",
    );
  });
});

Deno.test("deleteRoom removes unused room", async () => {
  await withKv(async () => {
    const room = await createRoom("Abstellraum");
    await deleteRoom(room.id);
    const found = await findRoom(room.id);
    assertEquals(found, null);
  });
});

Deno.test("deleteRoom rejects when items reference the room", async () => {
  await withKv(async () => {
    const room = await createRoom("Bad");
    const kv = await (await import("@/lib/kv/client.ts")).getKv();
    const itemId = "item-1";
    await kv.set(["item-by-room", room.id, itemId], true);
    await assertRejects(
      () => deleteRoom(room.id),
      Error,
      "in use",
    );
  });
});
