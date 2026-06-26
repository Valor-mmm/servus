import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { closeKv, getKv, setKv } from "@/lib/kv/client.ts";
import {
  createItem,
  deleteItem,
  findItem,
  findItemEntry,
  listItems,
  listItemsByCategory,
  listItemsByRoom,
  updateItem,
} from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const CAT_A = "cat-a";
const CAT_B = "cat-b";
const ROOM_X = "room-x";
const ROOM_Y = "room-y";

Deno.test("createItem sets status:complete and photos:[]", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Sofa",
      categoryId: CAT_A,
      roomId: ROOM_X,
      estimatedValue: null,
    });
    assertExists(item.id);
    assertEquals(item.status, "complete");
    assertEquals(item.photos, []);
    assertEquals(item.name, "Sofa");
    assertEquals(item.categoryId, CAT_A);
    assertEquals(item.roomId, ROOM_X);
    assertEquals(typeof item.createdAt, "number");
    assertEquals(typeof item.updatedAt, "number");
  });
});

Deno.test("updateItem: status=complete saves complete, status=incomplete saves incomplete", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Stuhl",
      categoryId: CAT_A,
      roomId: null,
      estimatedValue: null,
      status: "incomplete",
    });
    assertEquals(item.status, "incomplete");

    const updated = await updateItem(item.id, {
      status: "complete",
      name: item.name,
    });
    assertEquals(updated.status, "complete");

    const reverted = await updateItem(item.id, {
      status: "incomplete",
      name: item.name,
    });
    assertEquals(reverted.status, "incomplete");
  });
});

Deno.test("findItem returns null for unknown id", async () => {
  await withKv(async () => {
    const item = await findItem("nonexistent");
    assertEquals(item, null);
  });
});

Deno.test("findItem returns created item", async () => {
  await withKv(async () => {
    const created = await createItem({
      name: "Tisch",
      categoryId: CAT_A,
      roomId: null,
      estimatedValue: null,
    });
    const found = await findItem(created.id);
    assertExists(found);
    assertEquals(found.name, "Tisch");
  });
});

Deno.test("listItems returns all items", async () => {
  await withKv(async () => {
    await createItem({
      name: "A",
      categoryId: CAT_A,
      roomId: null,
      estimatedValue: null,
    });
    await createItem({
      name: "B",
      categoryId: CAT_B,
      roomId: ROOM_X,
      estimatedValue: null,
    });
    const items = await listItems();
    assertEquals(items.length, 2);
  });
});

Deno.test("listItemsByCategory returns items in that category only", async () => {
  await withKv(async () => {
    await createItem({
      name: "X",
      categoryId: CAT_A,
      roomId: null,
      estimatedValue: null,
    });
    await createItem({
      name: "Y",
      categoryId: CAT_B,
      roomId: null,
      estimatedValue: null,
    });
    const inA = await listItemsByCategory(CAT_A);
    assertEquals(inA.length, 1);
    assertEquals(inA[0].name, "X");
  });
});

Deno.test("listItemsByRoom returns items in that room only", async () => {
  await withKv(async () => {
    await createItem({
      name: "P",
      categoryId: CAT_A,
      roomId: ROOM_X,
      estimatedValue: null,
    });
    await createItem({
      name: "Q",
      categoryId: CAT_A,
      roomId: ROOM_Y,
      estimatedValue: null,
    });
    const inX = await listItemsByRoom(ROOM_X);
    assertEquals(inX.length, 1);
    assertEquals(inX[0].name, "P");
  });
});

Deno.test("updateItem changes category and updates indexes", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Regal",
      categoryId: CAT_A,
      roomId: null,
      estimatedValue: null,
    });
    await updateItem(item.id, { categoryId: CAT_B });
    const inA = await listItemsByCategory(CAT_A);
    const inB = await listItemsByCategory(CAT_B);
    assertEquals(inA.length, 0);
    assertEquals(inB.length, 1);
  });
});

Deno.test("updateItem changes room and updates indexes", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Lampe",
      categoryId: CAT_A,
      roomId: ROOM_X,
      estimatedValue: null,
    });
    await updateItem(item.id, { roomId: ROOM_Y });
    const inX = await listItemsByRoom(ROOM_X);
    const inY = await listItemsByRoom(ROOM_Y);
    assertEquals(inX.length, 0);
    assertEquals(inY.length, 1);
  });
});

Deno.test("updateItem clears roomId and removes index entry", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Stuhl",
      categoryId: CAT_A,
      roomId: ROOM_X,
      estimatedValue: null,
    });
    await updateItem(item.id, { roomId: null });
    const updated = await findItem(item.id);
    assertEquals(updated?.roomId, null);
    const inX = await listItemsByRoom(ROOM_X);
    assertEquals(inX.length, 0);
  });
});

Deno.test("deleteItem removes primary and all index entries", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Bett",
      categoryId: CAT_A,
      roomId: ROOM_X,
      estimatedValue: null,
    });
    await deleteItem(item.id);
    assertEquals(await findItem(item.id), null);
    assertEquals(await listItemsByCategory(CAT_A), []);
    assertEquals(await listItemsByRoom(ROOM_X), []);
  });
});

Deno.test("updateItem throws for unknown id", async () => {
  await withKv(async () => {
    await assertRejects(
      () => updateItem("nonexistent", { name: "test" }),
      Error,
      "not found",
    );
  });
});

Deno.test("updateItem: atomic check rejects stale versionstamp (concurrent write guard)", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Apfel",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
    });

    // Capture versionstamp before any update
    const entryBefore = await findItemEntry(item.id);
    const staleStamp = entryBefore.versionstamp;

    // Advance the item to a new versionstamp via a legitimate update
    await updateItem(item.id, { name: "Birne" });

    // Attempt a raw atomic with the now-stale versionstamp — simulates a
    // lost-update race where a concurrent writer read the old stamp
    const kv = await getKv();
    const result = await kv.atomic()
      .check({ key: ["item", item.id], versionstamp: staleStamp })
      .set(["item", item.id], { ...entryBefore.value, name: "Ghostwrite" })
      .commit();

    assertEquals(result.ok, false, "atomic must reject a stale versionstamp");

    // The legitimate update's value must be intact
    const current = await findItem(item.id);
    assertEquals(current?.name, "Birne");
  });
});

Deno.test("updateItem: versionstamp is available via findItemEntry", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Buch",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
    });

    const entry = await findItemEntry(item.id);
    assertExists(
      entry.versionstamp,
      "findItemEntry must return a versionstamp",
    );
    assertEquals(entry.value?.name, "Buch");

    // After an update, the versionstamp must change
    await updateItem(item.id, { name: "Buch 2" });
    const entry2 = await findItemEntry(item.id);
    assertExists(entry2.versionstamp);
    assertEquals(
      entry.versionstamp !== entry2.versionstamp,
      true,
      "versionstamp must change after an update",
    );
  });
});
