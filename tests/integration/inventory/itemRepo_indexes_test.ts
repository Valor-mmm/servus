import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  createItem,
  deleteItem,
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

const CAT_1 = "cat-1";
const CAT_2 = "cat-2";
const ROOM_1 = "room-1";
const ROOM_2 = "room-2";

Deno.test("index reflects item after create", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Regal",
      categoryId: CAT_1,
      roomId: ROOM_1,
      estimatedValue: null,
    });
    const byCat = await listItemsByCategory(CAT_1);
    const byRoom = await listItemsByRoom(ROOM_1);
    assertEquals(byCat.length, 1);
    assertEquals(byCat[0].id, item.id);
    assertEquals(byRoom.length, 1);
    assertEquals(byRoom[0].id, item.id);
  });
});

Deno.test("index reflects category change after update", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Stuhl",
      categoryId: CAT_1,
      roomId: null,
      estimatedValue: null,
    });
    await updateItem(item.id, { categoryId: CAT_2 });
    assertEquals(await listItemsByCategory(CAT_1), []);
    const inCat2 = await listItemsByCategory(CAT_2);
    assertEquals(inCat2.length, 1);
    assertEquals(inCat2[0].id, item.id);
  });
});

Deno.test("index reflects room change after update", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Tisch",
      categoryId: CAT_1,
      roomId: ROOM_1,
      estimatedValue: null,
    });
    await updateItem(item.id, { roomId: ROOM_2 });
    assertEquals(await listItemsByRoom(ROOM_1), []);
    const inRoom2 = await listItemsByRoom(ROOM_2);
    assertEquals(inRoom2.length, 1);
    assertEquals(inRoom2[0].id, item.id);
  });
});

Deno.test("index reflects room cleared after update", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Lampe",
      categoryId: CAT_1,
      roomId: ROOM_1,
      estimatedValue: null,
    });
    await updateItem(item.id, { roomId: null });
    assertEquals(await listItemsByRoom(ROOM_1), []);
  });
});

Deno.test("index reflects item after delete", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Bett",
      categoryId: CAT_1,
      roomId: ROOM_1,
      estimatedValue: null,
    });
    await deleteItem(item.id);
    assertEquals(await listItemsByCategory(CAT_1), []);
    assertEquals(await listItemsByRoom(ROOM_1), []);
  });
});

Deno.test("multiple items — category index returns only matching items", async () => {
  await withKv(async () => {
    const a = await createItem({
      name: "A",
      categoryId: CAT_1,
      roomId: null,
      estimatedValue: null,
    });
    const _b = await createItem({
      name: "B",
      categoryId: CAT_2,
      roomId: null,
      estimatedValue: null,
    });
    const inCat1 = await listItemsByCategory(CAT_1);
    assertEquals(inCat1.length, 1);
    assertEquals(inCat1[0].id, a.id);
  });
});
