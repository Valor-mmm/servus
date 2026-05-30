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

Deno.test("integration: createItem with quantity: 3 stores quantity: 3 in KV", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Teller",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 3,
    });

    // Verify via direct KV read (raw stored value)
    const kv = await getKv();
    const raw = await kv.get<Item>(["item", item.id]);
    assertEquals(raw.value?.quantity, 3);
  });
});

Deno.test("integration: updateItem quantity from 1 to 5 is persisted in KV", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Tasse",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 1,
    });

    await updateItem(item.id, { quantity: 5 });

    const kv = await getKv();
    const raw = await kv.get<Item>(["item", item.id]);
    assertEquals(raw.value?.quantity, 5);
  });
});

Deno.test("integration: quantity below 1 is coerced to 1 by createItem", async () => {
  await withKv(async () => {
    // The repo coerces invalid values to 1 (route validation catches < 1 first,
    // but the repo's coerce-at-write is also a safety net)
    const item = await createItem({
      name: "Löffel",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 0, // invalid — coerced to 1
    });

    assertEquals(item.quantity, 1);

    const found = await findItem(item.id);
    assertEquals(found?.quantity, 1);
  });
});
