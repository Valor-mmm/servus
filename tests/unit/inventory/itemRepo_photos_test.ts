import { assertEquals, assertExists } from "@std/assert";
import { closeKv, getKv, setKv } from "@/lib/kv/client.ts";
import { findItem, listItems } from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("legacy record without photos field reads as photos: []", async () => {
  await withKv(async () => {
    const kv = await getKv();
    const id = "legacy-item-1";
    // Simulate old KV record: no photos field
    await kv.set(["item", id], {
      id,
      name: "Old Sofa",
      categoryId: null,
      roomId: null,
      boxId: null,
      quantity: 1,
      estimatedValue: null,
      status: "complete",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // No photos field at all
    });

    const item = await findItem(id);
    assertExists(item);
    assertEquals(item.photos, []);
  });
});

Deno.test("legacy record with photoKey field reads as photos: []", async () => {
  await withKv(async () => {
    const kv = await getKv();
    const id = "legacy-item-2";
    // Simulate old KV record with photoKey (the old unused field)
    await kv.set(["item", id], {
      id,
      name: "Old Chair",
      categoryId: null,
      roomId: null,
      boxId: null,
      quantity: 1,
      estimatedValue: null,
      status: "complete",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      photoKey: "old-photo-key-abc",
      // No photos field
    });

    const item = await findItem(id);
    assertExists(item);
    assertEquals(item.photos, []);
  });
});

Deno.test("listItems coerces legacy records without photos to photos: []", async () => {
  await withKv(async () => {
    const kv = await getKv();
    // Legacy record 1
    await kv.set(["item", "leg-a"], {
      id: "leg-a",
      name: "Leg A",
      categoryId: null,
      roomId: null,
      boxId: null,
      quantity: 1,
      estimatedValue: null,
      status: "complete",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    // Legacy record 2 with photoKey
    await kv.set(["item", "leg-b"], {
      id: "leg-b",
      name: "Leg B",
      categoryId: null,
      roomId: null,
      boxId: null,
      quantity: 1,
      estimatedValue: null,
      status: "complete",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      photoKey: "some-old-key",
    });

    const items = await listItems();
    assertEquals(items.length, 2);
    for (const item of items) {
      assertEquals(item.photos, []);
    }
  });
});
