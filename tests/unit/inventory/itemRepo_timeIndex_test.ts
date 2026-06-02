import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  countItems,
  createItem,
  deleteItem,
  listItemsRecent,
} from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: (kv: Deno.Kv) => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn(kv);
  } finally {
    await closeKv();
  }
}

Deno.test("createItem writes item-by-time index entry", async () => {
  await withKv(async (kv) => {
    const item = await createItem({
      name: "Sofa",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
    });
    const entry = await kv.get(["item-by-time", item.createdAt, item.id]);
    assertEquals(entry.value, true);
  });
});

Deno.test("deleteItem removes item-by-time index entry", async () => {
  await withKv(async (kv) => {
    const item = await createItem({
      name: "Stuhl",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
    });
    await deleteItem(item.id);
    const entry = await kv.get(["item-by-time", item.createdAt, item.id]);
    assertEquals(entry.value, null);
  });
});

Deno.test("listItemsRecent returns newest items first", async () => {
  await withKv(async () => {
    const a = await createItem({
      name: "Älter",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
    });
    await new Promise((r) => setTimeout(r, 2));
    const b = await createItem({
      name: "Neuer",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
    });
    const recent = await listItemsRecent(10);
    assertEquals(recent.length, 2);
    assertEquals(recent[0].id, b.id);
    assertEquals(recent[1].id, a.id);
  });
});

Deno.test("listItemsRecent respects limit", async () => {
  await withKv(async () => {
    for (let i = 0; i < 5; i++) {
      await createItem({
        name: `Item ${i}`,
        categoryId: null,
        roomId: null,
        estimatedValue: null,
      });
      await new Promise((r) => setTimeout(r, 1));
    }
    const recent = await listItemsRecent(3);
    assertEquals(recent.length, 3);
  });
});

Deno.test("listItemsRecent returns all items when count below limit", async () => {
  await withKv(async () => {
    await createItem({
      name: "Einziger",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
    });
    const recent = await listItemsRecent(50);
    assertEquals(recent.length, 1);
  });
});

Deno.test("countItems returns correct count", async () => {
  await withKv(async () => {
    assertEquals(await countItems(), 0);
    await createItem({
      name: "A",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
    });
    await createItem({
      name: "B",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
    });
    assertEquals(await countItems(), 2);
  });
});

Deno.test("countItems returns 0 for empty KV", async () => {
  await withKv(async () => {
    assertEquals(await countItems(), 0);
  });
});
