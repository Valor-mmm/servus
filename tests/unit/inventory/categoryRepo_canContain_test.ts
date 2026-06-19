import { assertEquals, assertRejects } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  createCategory,
  updateCategory,
} from "@/lib/inventory/categoryRepo.ts";
import { createItem } from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("createCategory defaults canContain to false", async () => {
  await withKv(async () => {
    const cat = await createCategory("Möbel");
    assertEquals(cat.canContain, false);
  });
});

Deno.test("createCategory with canContain:true persists true", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    assertEquals(cat.canContain, true);
  });
});

Deno.test("updateCategory sets canContain:true", async () => {
  await withKv(async () => {
    const cat = await createCategory("Regale");
    const updated = await updateCategory(cat.id, { canContain: true });
    assertEquals(updated.canContain, true);
  });
});

Deno.test("updateCategory sets canContain:false when no occupied containers", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const updated = await updateCategory(cat.id, { canContain: false });
    assertEquals(updated.canContain, false);
  });
});

Deno.test("updateCategory rejects canContain:false when occupied containers exist", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    // Create a container item in this category
    const container = await createItem({
      name: "Kiste A",
      categoryId: cat.id,
      roomId: null,
      estimatedValue: null,
    });
    // Place another item inside it
    await createItem({
      name: "Werkzeug",
      categoryId: null,
      roomId: null,
      containerId: container.id,
      estimatedValue: null,
    });
    await assertRejects(
      () => updateCategory(cat.id, { canContain: false }),
      Error,
      "occupied",
    );
  });
});
