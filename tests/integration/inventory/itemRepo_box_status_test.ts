import { assertEquals } from "@std/assert";
import { closeKv, getKv, setKv } from "@/lib/kv/client.ts";
import type { Box } from "@/lib/inventory/types.ts";
import { createBox, findBox } from "@/lib/inventory/boxRepo.ts";
import {
  createItem,
  deleteItem,
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

Deno.test("createItem with boxId changes box status to packed", async () => {
  await withKv(async () => {
    const box = await createBox({});
    assertEquals((await findBox(box.id))?.status, "empty");

    await createItem({
      name: "Teller",
      categoryId: null,
      roomId: null,
      boxId: box.id,
      estimatedValue: null,
    });

    assertEquals((await findBox(box.id))?.status, "packed");
  });
});

Deno.test("removing last item via updateItem reverts box to empty", async () => {
  await withKv(async () => {
    const box = await createBox({});
    const item = await createItem({
      name: "Glas",
      categoryId: null,
      roomId: null,
      boxId: box.id,
      estimatedValue: null,
    });
    assertEquals((await findBox(box.id))?.status, "packed");

    await updateItem(item.id, { boxId: null });
    assertEquals((await findBox(box.id))?.status, "empty");
  });
});

Deno.test("removing last item via deleteItem reverts box to empty", async () => {
  await withKv(async () => {
    const box = await createBox({});
    const item = await createItem({
      name: "Messer",
      categoryId: null,
      roomId: null,
      boxId: box.id,
      estimatedValue: null,
    });
    assertEquals((await findBox(box.id))?.status, "packed");

    await deleteItem(item.id);
    assertEquals((await findBox(box.id))?.status, "empty");
  });
});

Deno.test("delivered box status not downgraded by item removal", async () => {
  await withKv(async () => {
    const box = await createBox({});
    const item = await createItem({
      name: "Pfanne",
      categoryId: null,
      roomId: null,
      boxId: box.id,
      estimatedValue: null,
    });

    // Simulate mark-as-delivered by patching KV directly
    const kv = await getKv();
    const entry = await kv.get<Box>(["box", box.id]);
    if (entry.value) {
      await kv.set(["box", box.id], { ...entry.value, status: "delivered" });
    }

    await deleteItem(item.id);
    assertEquals((await findBox(box.id))?.status, "delivered");
  });
});

Deno.test("updateItem moving item between boxes updates both box statuses", async () => {
  await withKv(async () => {
    const box1 = await createBox({});
    const box2 = await createBox({});

    const item = await createItem({
      name: "Tasse",
      categoryId: null,
      roomId: null,
      boxId: box1.id,
      estimatedValue: null,
    });
    assertEquals((await findBox(box1.id))?.status, "packed");
    assertEquals((await findBox(box2.id))?.status, "empty");

    await updateItem(item.id, { boxId: box2.id });
    assertEquals((await findBox(box1.id))?.status, "empty");
    assertEquals((await findBox(box2.id))?.status, "packed");
  });
});
