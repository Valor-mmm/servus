import { assertEquals, assertRejects } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { createCategory } from "@/lib/inventory/categoryRepo.ts";
import {
  createSchema,
  deleteSchema,
  listSchemaTypes,
  materializeForEditing,
  resolveSchema,
  updateSchema,
} from "@/lib/inventory/schemaRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const sample = {
  schemaType: "plant",
  label: "Pflanze",
  fields: [
    { key: "species", label: "Art", type: "text" as const },
    {
      key: "location",
      label: "Standort",
      type: "enum" as const,
      options: ["Innen", "Außen"],
    },
  ],
};

Deno.test("createSchema persists and resolveSchema returns it", async () => {
  await withKv(async () => {
    await createSchema(sample);
    const got = await resolveSchema("plant");
    assertEquals(got.label, "Pflanze");
    assertEquals(got.fields.map((f) => f.key), ["species", "location"]);
  });
});

Deno.test("resolveSchema returns the seeded built-in when no overlay exists", async () => {
  await withKv(async () => {
    const book = await resolveSchema("book");
    assertEquals(book.schemaType, "book");
    assertEquals(book.fields[0].key, "author");
  });
});

Deno.test("resolveSchema falls back to generic for unknown ids", async () => {
  await withKv(async () => {
    const g = await resolveSchema("nope");
    assertEquals(g.schemaType, "generic");
    assertEquals(g.fields.length, 0);
  });
});

Deno.test("createSchema rejects collision with a built-in id", async () => {
  await withKv(async () => {
    await assertRejects(() => createSchema({ ...sample, schemaType: "book" }));
  });
});

Deno.test("createSchema rejects collision with an existing overlay id", async () => {
  await withKv(async () => {
    await createSchema(sample);
    await assertRejects(() => createSchema(sample));
  });
});

Deno.test("listSchemaTypes merges built-ins and user schemas, tagged by source", async () => {
  await withKv(async () => {
    await createSchema(sample);
    const list = await listSchemaTypes();
    const plant = list.find((s) => s.schemaType === "plant");
    const book = list.find((s) => s.schemaType === "book");
    assertEquals(plant?.source, "user");
    assertEquals(book?.source, "builtin");
  });
});

Deno.test("editing a built-in materialises a literal-label override (copy-on-write)", async () => {
  await withKv(async () => {
    // Load the built-in for editing: labels should be literal German, not keys.
    const editable = await materializeForEditing("book");
    assertEquals(editable.label, "Buch");
    assertEquals(editable.fields[0].label, "Autor");

    // Save an extended version.
    await updateSchema("book", {
      schemaType: "book",
      label: "Buch",
      fields: [
        ...editable.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          options: f.options,
        })),
        { key: "language", label: "Sprache", type: "text" },
      ],
    });

    const resolved = await resolveSchema("book");
    assertEquals(resolved.fields.some((f) => f.key === "language"), true);
    assertEquals(resolved.label, "Buch"); // literal, no longer the i18n key

    const list = await listSchemaTypes();
    assertEquals(list.find((s) => s.schemaType === "book")?.source, "user");
  });
});

Deno.test("deleting a built-in override reverts resolution to the seed", async () => {
  await withKv(async () => {
    await updateSchema("book", {
      schemaType: "book",
      label: "Buch",
      fields: [{ key: "language", label: "Sprache", type: "text" }],
    });
    assertEquals((await resolveSchema("book")).fields[0].key, "language");

    await deleteSchema("book");
    const reverted = await resolveSchema("book");
    assertEquals(reverted.fields[0].key, "author"); // seed restored
  });
});

Deno.test("updateSchema cannot change the schemaType id", async () => {
  await withKv(async () => {
    await createSchema(sample);
    await assertRejects(() =>
      updateSchema("plant", { ...sample, schemaType: "renamed" })
    );
  });
});

// ── Deletion guard ─────────────────────────────────────────────────────────

Deno.test("deleting a user schema no category uses succeeds", async () => {
  await withKv(async () => {
    await createSchema(sample);
    await deleteSchema("plant");
    const list = await listSchemaTypes();
    assertEquals(list.some((s) => s.schemaType === "plant"), false);
  });
});

Deno.test("deleting a user schema a category uses is rejected", async () => {
  await withKv(async () => {
    await createSchema(sample);
    await createCategory("Pflanzen", "plant");
    await assertRejects(() => deleteSchema("plant"));
  });
});

Deno.test("built-in schemas cannot be deleted (no override present)", async () => {
  await withKv(async () => {
    await assertRejects(() => deleteSchema("tool"));
    await assertRejects(() => deleteSchema("generic"));
  });
});
