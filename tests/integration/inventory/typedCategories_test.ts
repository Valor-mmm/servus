import { assertEquals, assertRejects } from "@std/assert";
import { closeKv, getKv, setKv } from "@/lib/kv/client.ts";
import {
  createCategory,
  findCategory,
  listCategories,
  updateCategory,
} from "@/lib/inventory/categoryRepo.ts";
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

Deno.test("category persists its schemaType and round-trips", async () => {
  await withKv(async () => {
    const cat = await createCategory("Bücher", "book");
    assertEquals(cat.schemaType, "book");
    const found = await findCategory(cat.id);
    assertEquals(found?.schemaType, "book");
  });
});

Deno.test("createCategory defaults schemaType to generic", async () => {
  await withKv(async () => {
    const cat = await createCategory("Sonstiges");
    assertEquals(cat.schemaType, "generic");
  });
});

Deno.test("createCategory rejects an unknown schemaType", async () => {
  await withKv(async () => {
    await assertRejects(
      () => createCategory("Mist", "not-a-schema"),
      Error,
    );
  });
});

Deno.test("item metadata is validated against its category schema and round-trips", async () => {
  await withKv(async () => {
    const cat = await createCategory("Bücher", "book");
    const item = await createItem({
      name: "Der Hobbit",
      categoryId: cat.id,
      roomId: null,
      estimatedValue: null,
      metadata: { author: "Tolkien", year: "1937", bogus: "x" },
      warrantyUntil: null,
    });
    // unknown key dropped, number coerced
    assertEquals(item.metadata.author, "Tolkien");
    assertEquals(item.metadata.year, 1937);
    assertEquals("bogus" in item.metadata, false);

    const found = await findItem(item.id);
    assertEquals(found?.metadata.year, 1937);
  });
});

Deno.test("item warrantyUntil round-trips and rejects bad dates", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Bohrmaschine",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
      warrantyUntil: "2027-01-01",
    });
    assertEquals(item.warrantyUntil, "2027-01-01");

    await assertRejects(() =>
      createItem({
        name: "Kaputt",
        categoryId: null,
        roomId: null,
        estimatedValue: null,
        warrantyUntil: "01.01.2027",
      })
    );
  });
});

Deno.test("changing an item's category re-filters metadata to the new schema", async () => {
  await withKv(async () => {
    const book = await createCategory("Bücher", "book");
    const kitchen = await createCategory("Küche", "kitchenware");
    const item = await createItem({
      name: "Ding",
      categoryId: book.id,
      roomId: null,
      estimatedValue: null,
      metadata: { author: "X" },
    });
    assertEquals(item.metadata.author, "X");

    const updated = await updateItem(item.id, {
      categoryId: kitchen.id,
      metadata: { material: "Keramik" },
    });
    // author is not in kitchenware schema → dropped; material kept
    assertEquals("author" in updated.metadata, false);
    assertEquals(updated.metadata.material, "Keramik");
  });
});

// ── Legacy / live-data backward compatibility ──────────────────────────────

Deno.test("legacy category record (no schemaType) decodes as generic and is editable", async () => {
  await withKv(async () => {
    const kv = await getKv();
    const id = "legacy-cat";
    // Pre-change shape: no schemaType field.
    await kv.set(["category", id], {
      id,
      name: "Tassen",
      createdAt: Date.now(),
    });
    await kv.set(["category-by-name", "tassen"], id);

    const found = await findCategory(id);
    assertEquals(found?.schemaType, "generic");

    const list = await listCategories();
    assertEquals(list.find((c) => c.id === id)?.schemaType, "generic");

    // The migration story: retype it to kitchenware by hand.
    const updated = await updateCategory(id, { schemaType: "kitchenware" });
    assertEquals(updated.schemaType, "kitchenware");
    assertEquals((await findCategory(id))?.schemaType, "kitchenware");
  });
});

Deno.test("legacy item record (no metadata/warrantyUntil) decodes to defaults and persists them on write", async () => {
  await withKv(async () => {
    const kv = await getKv();
    const id = "legacy-item";
    const now = Date.now();
    // Pre-change shape: no metadata / warrantyUntil.
    await kv.set(["item", id], {
      id,
      name: "Alte Tasse",
      categoryId: null,
      roomId: null,
      boxId: null,
      quantity: 1,
      estimatedValue: null,
      photos: [],
      status: "confirmed",
      createdAt: now,
      updatedAt: now,
    });

    const found = await findItem(id);
    assertEquals(found?.metadata && typeof found.metadata, "object");
    assertEquals(Object.keys(found!.metadata).length, 0);
    assertEquals(found?.warrantyUntil, null);

    // Editing persists the defaults.
    const updated = await updateItem(id, { name: "Tasse" });
    assertEquals(updated.warrantyUntil, null);
    assertEquals(Object.keys(updated.metadata).length, 0);
    const reread = await kv.get<Record<string, unknown>>(["item", id]);
    assertEquals("metadata" in (reread.value ?? {}), true);
    assertEquals("warrantyUntil" in (reread.value ?? {}), true);
  });
});
