import { assertEquals } from "@std/assert";
import { closeKv, getKv, setKv } from "@/lib/kv/client.ts";
import { createItem, findItem, updateItem } from "@/lib/inventory/itemRepo.ts";
import type { Item } from "@/lib/inventory/types.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const CAT = "cat-a";

Deno.test("createItem without quantity stores quantity: 1", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Gabel",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
    });
    assertEquals(item.quantity, 1);
  });
});

Deno.test("createItem with quantity: 6 stores quantity: 6", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Gabel",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 6,
    });
    assertEquals(item.quantity, 6);
  });
});

Deno.test("legacy record without quantity field reads back as quantity: 1", async () => {
  await withKv(async () => {
    // Simulate a legacy record stored without quantity
    const legacyItem: Omit<Item, "quantity"> = {
      id: "legacy-id",
      name: "Altes Ding",
      categoryId: CAT,
      roomId: null,
      boxId: null,
      estimatedValue: null,
      photoKey: null,
      status: "confirmed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const kv = await getKv();
    await kv.set(["item", "legacy-id"], legacyItem);

    const found = await findItem("legacy-id");
    assertEquals(found?.quantity, 1);
  });
});

Deno.test("updateItem persists changed quantity", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Teller",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 1,
    });
    const updated = await updateItem(item.id, { quantity: 12 });
    assertEquals(updated.quantity, 12);
    const found = await findItem(item.id);
    assertEquals(found?.quantity, 12);
  });
});
