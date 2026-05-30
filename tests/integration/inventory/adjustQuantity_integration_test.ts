import { assertEquals } from "@std/assert";
import { closeKv, getKv, setKv } from "@/lib/kv/client.ts";
import {
  adjustQuantity,
  createItem,
  findItem,
} from "@/lib/inventory/itemRepo.ts";
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

const CAT = "cat-int";

Deno.test("integration: qty_inc — adjustQuantity +1 persists in KV", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Suppenteller",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 3,
    });

    await adjustQuantity(item.id, 1);

    const kv = await getKv();
    const raw = await kv.get<Item>(["item", item.id]);
    assertEquals(raw.value?.quantity, 4);
  });
});

Deno.test("integration: qty_dec — adjustQuantity -1 persists in KV (floor 1)", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Weinglas",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 3,
    });

    await adjustQuantity(item.id, -1);

    const kv = await getKv();
    const raw = await kv.get<Item>(["item", item.id]);
    assertEquals(raw.value?.quantity, 2);

    // Decrement to floor
    await adjustQuantity(item.id, -1);
    await adjustQuantity(item.id, -1);

    const atOne = await findItem(item.id);
    assertEquals(atOne?.quantity, 1);

    // Another decrement — stays at 1
    await adjustQuantity(item.id, -1);
    const stillOne = await findItem(item.id);
    assertEquals(stillOne?.quantity, 1);
  });
});
