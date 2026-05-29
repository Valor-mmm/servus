import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  createCategory,
  deleteCategory,
  findCategory,
  listCategories,
} from "@/lib/inventory/categoryRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("createCategory returns a category with generated id", async () => {
  await withKv(async () => {
    const cat = await createCategory("Bücher");
    assertExists(cat.id);
    assertEquals(cat.name, "Bücher");
    assertEquals(typeof cat.createdAt, "number");
  });
});

Deno.test("findCategory returns null for unknown id", async () => {
  await withKv(async () => {
    const cat = await findCategory("nonexistent");
    assertEquals(cat, null);
  });
});

Deno.test("findCategory returns created category", async () => {
  await withKv(async () => {
    const created = await createCategory("Elektro");
    const found = await findCategory(created.id);
    assertExists(found);
    assertEquals(found.name, "Elektro");
  });
});

Deno.test("listCategories returns all categories", async () => {
  await withKv(async () => {
    await createCategory("Alpha");
    await createCategory("Beta");
    const list = await listCategories();
    assertEquals(list.length, 2);
  });
});

Deno.test("createCategory rejects duplicate name (case-insensitive)", async () => {
  await withKv(async () => {
    await createCategory("Möbel");
    await assertRejects(
      () => createCategory("möbel"),
      Error,
      "already exists",
    );
  });
});

Deno.test("deleteCategory removes unused category", async () => {
  await withKv(async () => {
    const cat = await createCategory("Werkzeug");
    await deleteCategory(cat.id);
    const found = await findCategory(cat.id);
    assertEquals(found, null);
  });
});

Deno.test("deleteCategory rejects when items reference the category", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kleidung");
    // Simulate an item referencing the category via the index key
    const kv = await (await import("@/lib/kv/client.ts")).getKv();
    const itemId = "item-1";
    await kv.set(["item-by-category", cat.id, itemId], true);
    await assertRejects(
      () => deleteCategory(cat.id),
      Error,
      "in use",
    );
  });
});
