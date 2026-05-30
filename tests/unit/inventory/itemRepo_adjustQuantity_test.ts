import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  adjustQuantity,
  createItem,
  findItem,
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

const CAT = "cat-a";

Deno.test("adjustQuantity +1 increments stored quantity", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Gabel",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 3,
    });
    const updated = await adjustQuantity(item.id, 1);
    assertEquals(updated.quantity, 4);
    const found = await findItem(item.id);
    assertEquals(found?.quantity, 4);
  });
});

Deno.test("adjustQuantity -1 decrements stored quantity (floor 1)", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Teller",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 5,
    });
    const updated = await adjustQuantity(item.id, -1);
    assertEquals(updated.quantity, 4);
  });
});

Deno.test("adjustQuantity -1 when quantity is 1 is a no-op", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Messer",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 1,
    });
    const unchanged = await adjustQuantity(item.id, -1);
    assertEquals(unchanged.quantity, 1);
    const found = await findItem(item.id);
    assertEquals(found?.quantity, 1);
  });
});
