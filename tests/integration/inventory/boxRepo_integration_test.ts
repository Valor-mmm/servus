import { assertEquals, assertRejects } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  createBox,
  deleteBox,
  findBox,
  findBoxByCode,
  listBoxes,
  updateBox,
} from "@/lib/inventory/boxRepo.ts";
import { createItem, updateItem } from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("sequential codes are unique across sequential creates", async () => {
  await withKv(async () => {
    const boxes = await Promise.all([
      createBox({}),
      createBox({}),
      createBox({}),
      createBox({}),
      createBox({}),
    ]);
    const codes = boxes.map((b) => b.code);
    const unique = new Set(codes);
    assertEquals(unique.size, 5);
    // All codes should follow the B-NNN format
    for (const code of codes) {
      assertEquals(/^B-\d{3,}$/.test(code), true);
    }
  });
});

Deno.test("listBoxes item count is 0 for new box", async () => {
  await withKv(async () => {
    await createBox({ label: "Empty" });
    const list = await listBoxes();
    assertEquals(list.length, 1);
    assertEquals(list[0].itemCount, 0);
  });
});

Deno.test("listBoxes item count reflects items assigned via itemRepo", async () => {
  await withKv(async () => {
    const box = await createBox({});
    await createItem({
      name: "A",
      categoryId: null,
      roomId: null,
      boxId: box.id,
      estimatedValue: null,
    });
    await createItem({
      name: "B",
      categoryId: null,
      roomId: null,
      boxId: box.id,
      estimatedValue: null,
    });
    const list = await listBoxes();
    assertEquals(list[0].itemCount, 2);
  });
});

Deno.test("listBoxes item count decreases when item is unboxed", async () => {
  await withKv(async () => {
    const box = await createBox({});
    const item = await createItem({
      name: "C",
      categoryId: null,
      roomId: null,
      boxId: box.id,
      estimatedValue: null,
    });
    await updateItem(item.id, { boxId: null });
    const list = await listBoxes();
    assertEquals(list[0].itemCount, 0);
  });
});

Deno.test("deleteBox rejects when items are assigned", async () => {
  await withKv(async () => {
    const box = await createBox({});
    await createItem({
      name: "Fragile",
      categoryId: null,
      roomId: null,
      boxId: box.id,
      estimatedValue: null,
    });
    await assertRejects(() => deleteBox(box.id), Error, "not empty");
  });
});

Deno.test("destinationRoom can be set and cleared", async () => {
  await withKv(async () => {
    const box = await createBox({ destinationRoomId: "room-1" });
    assertEquals(box.destinationRoomId, "room-1");

    const cleared = await updateBox(box.id, { destinationRoomId: null });
    assertEquals(cleared.destinationRoomId, null);

    const found = await findBox(box.id);
    assertEquals(found?.destinationRoomId, null);
  });
});

Deno.test("findBoxByCode works after box is created", async () => {
  await withKv(async () => {
    const b1 = await createBox({});
    const b2 = await createBox({});
    const found1 = await findBoxByCode(b1.code);
    const found2 = await findBoxByCode(b2.code);
    assertEquals(found1?.id, b1.id);
    assertEquals(found2?.id, b2.id);
  });
});
