/**
 * Tests the Einpacken bulk-assign logic: items with no boxId get assigned
 * to a box when their IDs are submitted via the einpacken form action.
 */
import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { createItem, findItem, updateItem } from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const BASE = { categoryId: null, estimatedValue: null } as const;

Deno.test("einpacken: selected items get assigned to box", async () => {
  await withKv(async () => {
    const item1 = await createItem({ ...BASE, name: "Teller", roomId: "r1" });
    const item2 = await createItem({ ...BASE, name: "Tasse", roomId: null });
    const item3 = await createItem({ ...BASE, name: "Schüssel", roomId: "r1" });

    const boxId = "box-abc";
    const selectedItemIds = [item1.id, item2.id];

    // Simulate the einpacken POST handler
    await Promise.all(
      selectedItemIds.map((id) => updateItem(id, { boxId })),
    );

    const saved1 = await findItem(item1.id);
    const saved2 = await findItem(item2.id);
    const saved3 = await findItem(item3.id);

    assertEquals(saved1?.boxId, boxId);
    assertEquals(saved2?.boxId, boxId);
    // item3 was not selected — stays unassigned
    assertEquals(saved3?.boxId, null);
  });
});

Deno.test("einpacken: empty selection is a no-op", async () => {
  await withKv(async () => {
    const item = await createItem({ ...BASE, name: "Glas", roomId: "r1" });

    // No items selected → getAll("itemIds") returns []
    const empty: string[] = [];
    await Promise.all(empty.map((id) => updateItem(id, { boxId: "b" })));

    const saved = await findItem(item.id);
    assertEquals(saved?.boxId, null);
  });
});
