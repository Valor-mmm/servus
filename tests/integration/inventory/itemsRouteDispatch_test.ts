/**
 * Integration tests for the items route load strategy dispatch.
 * Tests that each branch of the filter-aware dispatch table returns
 * the correct items using in-memory KV.
 */
import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  countItems,
  createItem,
  listItems,
  listItemsByCategory,
  listItemsByRoom,
  listItemsRecent,
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

async function makeItem(
  name: string,
  cat: string | null,
  room: string | null,
): Promise<void> {
  await createItem({
    name,
    categoryId: cat,
    roomId: room,
    estimatedValue: null,
  });
  await new Promise((r) => setTimeout(r, 1));
}

Deno.test("dispatch: no params — listItemsRecent(50) returns at most 50 newest", async () => {
  await withKv(async () => {
    for (let i = 0; i < 5; i++) {
      await makeItem(`Item ${i}`, CAT_A, null);
    }
    const items = await listItemsRecent(50);
    assertEquals(items.length, 5);
  });
});

Deno.test("dispatch: no params — listItemsRecent respects limit of 50", async () => {
  await withKv(async () => {
    // Create 55 items
    for (let i = 0; i < 55; i++) {
      await makeItem(`Item ${i}`, CAT_A, null);
    }
    const items = await listItemsRecent(50);
    assertEquals(items.length, 50);
  });
});

Deno.test("dispatch: ?all=1 — listItems() returns all items", async () => {
  await withKv(async () => {
    for (let i = 0; i < 55; i++) {
      await makeItem(`Item ${i}`, CAT_A, null);
    }
    const items = await listItems();
    assertEquals(items.length, 55);
  });
});

Deno.test("dispatch: ?cat=X — listItemsByCategory returns only that category", async () => {
  await withKv(async () => {
    await makeItem("Alpha", CAT_A, null);
    await makeItem("Beta", CAT_B, null);
    await makeItem("Gamma", CAT_A, null);
    const items = await listItemsByCategory(CAT_A);
    assertEquals(items.length, 2);
    assertEquals(items.every((i) => i.categoryId === CAT_A), true);
  });
});

Deno.test("dispatch: ?room=Y — listItemsByRoom returns only that room", async () => {
  await withKv(async () => {
    await makeItem("Sofa", CAT_A, ROOM_X);
    await makeItem("Bett", CAT_A, ROOM_Y);
    await makeItem("Tisch", CAT_A, ROOM_X);
    const items = await listItemsByRoom(ROOM_X);
    assertEquals(items.length, 2);
    assertEquals(items.every((i) => i.roomId === ROOM_X), true);
  });
});

Deno.test("dispatch: ?q=text — listItems() + substring filter searches full corpus", async () => {
  await withKv(async () => {
    await makeItem("Winterjacke", CAT_A, null);
    await makeItem("Sommerhut", CAT_A, null);
    await makeItem("Winterstiefel", CAT_A, null);
    const all = await listItems();
    const q = "winter";
    const filtered = all.filter((i) => i.name.toLowerCase().includes(q));
    assertEquals(filtered.length, 2);
  });
});

Deno.test("dispatch: ?q=text&cat=X — category index + substring filter", async () => {
  await withKv(async () => {
    await makeItem("Winterjacke", CAT_A, null);
    await makeItem("Sommerhut", CAT_A, null);
    await makeItem("Wintermantel", CAT_B, null);
    const byCat = await listItemsByCategory(CAT_A);
    const q = "winter";
    const filtered = byCat.filter((i) => i.name.toLowerCase().includes(q));
    assertEquals(filtered.length, 1);
    assertEquals(filtered[0].name, "Winterjacke");
  });
});

Deno.test("browse limit: countItems returns total including items outside recent 50", async () => {
  await withKv(async () => {
    for (let i = 0; i < 60; i++) {
      await makeItem(`Item ${i}`, null, null);
    }
    const count = await countItems();
    assertEquals(count, 60);
    const recent = await listItemsRecent(50);
    assertEquals(recent.length, 50);
    // Full load shows all 60
    const all = await listItems();
    assertEquals(all.length, 60);
  });
});
