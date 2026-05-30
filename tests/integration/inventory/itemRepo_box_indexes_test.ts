import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  createItem,
  deleteItem,
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

const BOX_1 = "box-1";
const BOX_2 = "box-2";
const ROOM_1 = "room-1";

Deno.test("listItemsByBox reflects item after create", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Vase",
      categoryId: null,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    const inBox = await listItemsByBox(BOX_1);
    assertEquals(inBox.length, 1);
    assertEquals(inBox[0].id, item.id);
  });
});

Deno.test("listItemsByBox reflects box change after update", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Lampe",
      categoryId: null,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    await updateItem(item.id, { boxId: BOX_2 });
    assertEquals(await listItemsByBox(BOX_1), []);
    const inBox2 = await listItemsByBox(BOX_2);
    assertEquals(inBox2.length, 1);
    assertEquals(inBox2[0].id, item.id);
  });
});

Deno.test("listItemsByBox empty after box cleared", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Stuhl",
      categoryId: null,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    await updateItem(item.id, { boxId: null });
    assertEquals(await listItemsByBox(BOX_1), []);
  });
});

Deno.test("listItemsByBox empty after room assigned (mutual exclusion)", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Tisch",
      categoryId: null,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    await updateItem(item.id, { roomId: ROOM_1 });
    assertEquals(await listItemsByBox(BOX_1), []);
    // item still has roomId set
    const updated = await createItem({
      name: "ignore",
      categoryId: null,
      roomId: null,
      boxId: null,
      estimatedValue: null,
    });
    // check the original item
    const _ = updated; // suppress unused warning
    const inBox = await listItemsByBox(BOX_1);
    assertEquals(inBox.length, 0);
  });
});

Deno.test("listItemsByBox empty after delete", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Kiste",
      categoryId: null,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    await deleteItem(item.id);
    assertEquals(await listItemsByBox(BOX_1), []);
  });
});

Deno.test("multiple items — listItemsByBox returns only items for that box", async () => {
  await withKv(async () => {
    const a = await createItem({
      name: "A",
      categoryId: null,
      roomId: null,
      boxId: BOX_1,
      estimatedValue: null,
    });
    await createItem({
      name: "B",
      categoryId: null,
      roomId: null,
      boxId: BOX_2,
      estimatedValue: null,
    });
    const inBox1 = await listItemsByBox(BOX_1);
    assertEquals(inBox1.length, 1);
    assertEquals(inBox1[0].id, a.id);
  });
});
