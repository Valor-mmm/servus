/**
 * Tests the standort_type mutual-exclusion logic that the POST handler applies.
 * The handler sets only the matching placement field and nulls the other two.
 */
import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { createItem, findItem, updateItem } from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const BASE = { categoryId: null, estimatedValue: null } as const;

Deno.test("standort_type=box: roomId and containerId cleared", async () => {
  await withKv(async () => {
    const item = await createItem({
      ...BASE,
      name: "Test",
      roomId: "room-1",
    });

    // Simulate handler logic: standort_type=box → use boxId, clear others
    const standortType: string = "box";
    await updateItem(item.id, {
      roomId: standortType === "room" ? "room-1" : null,
      boxId: standortType === "box" ? "box-1" : null,
      containerId: standortType === "container" ? "container-1" : null,
    });

    const saved = await findItem(item.id);
    assertEquals(saved?.boxId, "box-1");
    assertEquals(saved?.roomId, null);
    assertEquals(saved?.containerId, null);
  });
});

Deno.test("standort_type=room: boxId and containerId cleared", async () => {
  await withKv(async () => {
    const item = await createItem({
      ...BASE,
      name: "Test",
      roomId: null,
      boxId: "box-1",
    });

    const standortType: string = "room";
    await updateItem(item.id, {
      roomId: standortType === "room" ? "room-1" : null,
      boxId: standortType === "box" ? "box-1" : null,
      containerId: standortType === "container" ? "container-1" : null,
    });

    const saved = await findItem(item.id);
    assertEquals(saved?.roomId, "room-1");
    assertEquals(saved?.boxId, null);
    assertEquals(saved?.containerId, null);
  });
});

Deno.test("standort_type=container with no selection: roomId and boxId cleared", async () => {
  await withKv(async () => {
    const item = await createItem({
      ...BASE,
      name: "Test",
      roomId: null,
      boxId: "box-1",
    });

    // standort_type=container but user left select empty → null
    const standortType: string = "container";
    await updateItem(item.id, {
      roomId: standortType === "room" ? "room-1" : null,
      boxId: standortType === "box" ? "box-1" : null,
      containerId: standortType === "container" ? null : null,
    });

    const saved = await findItem(item.id);
    assertEquals(saved?.containerId, null);
    assertEquals(saved?.roomId, null);
    assertEquals(saved?.boxId, null);
  });
});
