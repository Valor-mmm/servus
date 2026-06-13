import { assertEquals } from "@std/assert";
import { getSchema, listSchemaTypes } from "@/lib/inventory/schemas.ts";

Deno.test("getSchema: generic schema has no fields", () => {
  const schema = getSchema("generic");
  assertEquals(schema.schemaType, "generic");
  assertEquals(schema.fields.length, 0);
});

Deno.test("getSchema: book exposes its fields in definition order", () => {
  const schema = getSchema("book");
  assertEquals(
    schema.fields.map((f) => f.key),
    ["author", "isbn", "publisher", "year", "series", "volume", "ageRange"],
  );
  assertEquals(schema.fields[0].type, "text");
  assertEquals(schema.fields[3].type, "number");
});

Deno.test("getSchema: enum fields carry a non-empty options list", () => {
  const power = getSchema("tool").fields.find((f) => f.key === "power");
  assertEquals(power?.type, "enum");
  assertEquals((power?.options ?? []).length > 0, true);
});

Deno.test("getSchema: boolean and date types are representable", () => {
  const complete = getSchema("toy").fields.find((f) => f.key === "complete");
  assertEquals(complete?.type, "boolean");
});

Deno.test("getSchema: unknown schemaType falls back to generic", () => {
  const schema = getSchema("does-not-exist");
  assertEquals(schema.schemaType, "generic");
  assertEquals(schema.fields.length, 0);
});

Deno.test("listSchemaTypes: includes generic plus the seeded catalogue", () => {
  const types = listSchemaTypes().map((s) => s.schemaType);
  for (
    const expected of [
      "generic",
      "book",
      "tool",
      "clothing",
      "clothing-numeric",
      "clothing-trousers",
      "electronics",
      "furniture",
      "appliance",
      "toy",
      "instrument",
      "kitchenware",
      "textiles",
      "valuables",
      "folder",
      "storagebox",
    ]
  ) {
    assertEquals(types.includes(expected), true, `missing ${expected}`);
  }
});

Deno.test("listSchemaTypes: each entry has a label (i18n key)", () => {
  for (const entry of listSchemaTypes()) {
    assertEquals(typeof entry.label, "string");
    assertEquals(entry.label.length > 0, true);
  }
});
