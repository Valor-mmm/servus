import { assertEquals, assertExists } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  createItem,
  deleteItem,
  findItem,
  listItemsByBox,
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
const BOX_1 = "box-1";
const BOX_2 = "box-2";
const ROOM_X = "room-x";

Deno.test("createItem with boxId sets boxId and clears roomId", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Tisch",
      categoryId: null,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    assertEquals(item.boxId, BOX_1);
    assertEquals(item.roomId, null);
  });
});

Deno.test("createItem with null categoryId is allowed", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Stuhl",
      categoryId: null,
      roomId: null,
      boxId: null,
      estimatedValue: null,
    });
    assertExists(item.id);
    assertEquals(item.categoryId, null);
  });
});

Deno.test("listItemsByBox returns items in that box only", async () => {
  await withKv(async () => {
    await createItem({
      name: "Lampe",
      categoryId: null,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    await createItem({
      name: "Sofa",
      categoryId: null,
      roomId: null,
      boxId: BOX_2,
      estimatedValue: null,
    });
    const inBox1 = await listItemsByBox(BOX_1);
    assertEquals(inBox1.length, 1);
    assertEquals(inBox1[0].name, "Lampe");
  });
});

Deno.test("updateItem assigning box clears roomId and updates indexes", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Regal",
      categoryId: CAT_A,
      roomId: ROOM_X,
      boxId: null,
      estimatedValue: null,
    });
    await updateItem(item.id, { boxId: BOX_1 });
    const updated = await findItem(item.id);
    assertEquals(updated?.boxId, BOX_1);
    assertEquals(updated?.roomId, null);
    const inBox = await listItemsByBox(BOX_1);
    assertEquals(inBox.length, 1);
  });
});

Deno.test("updateItem assigning room clears boxId and updates indexes", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Bett",
      categoryId: CAT_A,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    await updateItem(item.id, { roomId: ROOM_X });
    const updated = await findItem(item.id);
    assertEquals(updated?.roomId, ROOM_X);
    assertEquals(updated?.boxId, null);
    const inBox = await listItemsByBox(BOX_1);
    assertEquals(inBox.length, 0);
  });
});

Deno.test("updateItem clearing boxId removes from index", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Kiste",
      categoryId: null,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    await updateItem(item.id, { boxId: null });
    const updated = await findItem(item.id);
    assertEquals(updated?.boxId, null);
    const inBox = await listItemsByBox(BOX_1);
    assertEquals(inBox.length, 0);
  });
});

Deno.test("deleteItem removes box index entry", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Vase",
      categoryId: null,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    await deleteItem(item.id);
    assertEquals(await findItem(item.id), null);
    assertEquals(await listItemsByBox(BOX_1), []);
  });
});
