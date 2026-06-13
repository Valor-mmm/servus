import { assertEquals, assertThrows } from "@std/assert";
import { validateSchemaDefinition } from "@/lib/inventory/validateSchema.ts";

const valid = {
  schemaType: "my-type",
  label: "Mein Typ",
  fields: [
    { key: "color", label: "Farbe", type: "text" as const },
    {
      key: "size",
      label: "Größe",
      type: "enum" as const,
      options: ["Klein", "Groß"],
    },
  ],
};

Deno.test("validateSchemaDefinition: accepts a valid definition", () => {
  const out = validateSchemaDefinition(valid);
  assertEquals(out.schemaType, "my-type");
  assertEquals(out.fields.length, 2);
  assertEquals(out.fields[1].options, ["Klein", "Groß"]);
});

Deno.test("validateSchemaDefinition: accepts all five field types", () => {
  const out = validateSchemaDefinition({
    schemaType: "all",
    label: "Alle",
    fields: [
      { key: "a", label: "A", type: "text" },
      { key: "b", label: "B", type: "number" },
      { key: "c", label: "C", type: "date" },
      { key: "d", label: "D", type: "boolean" },
      { key: "e", label: "E", type: "enum", options: ["x"] },
    ],
  });
  assertEquals(out.fields.length, 5);
});

Deno.test("validateSchemaDefinition: rejects empty schemaType", () => {
  assertThrows(() => validateSchemaDefinition({ ...valid, schemaType: "" }));
});

Deno.test("validateSchemaDefinition: rejects non-slug schemaType", () => {
  assertThrows(() =>
    validateSchemaDefinition({ ...valid, schemaType: "Mein Typ!" })
  );
});

Deno.test("validateSchemaDefinition: rejects empty label", () => {
  assertThrows(() => validateSchemaDefinition({ ...valid, label: "  " }));
});

Deno.test("validateSchemaDefinition: rejects duplicate field keys", () => {
  assertThrows(() =>
    validateSchemaDefinition({
      schemaType: "dup",
      label: "Dup",
      fields: [
        { key: "x", label: "X1", type: "text" },
        { key: "x", label: "X2", type: "text" },
      ],
    })
  );
});

Deno.test("validateSchemaDefinition: rejects non-slug field key", () => {
  assertThrows(() =>
    validateSchemaDefinition({
      schemaType: "t",
      label: "T",
      fields: [{ key: "Not A Key", label: "X", type: "text" }],
    })
  );
});

Deno.test("validateSchemaDefinition: rejects unknown field type", () => {
  assertThrows(() =>
    validateSchemaDefinition({
      schemaType: "t",
      label: "T",
      // deno-lint-ignore no-explicit-any
      fields: [{ key: "x", label: "X", type: "stars" as any }],
    })
  );
});

Deno.test("validateSchemaDefinition: rejects enum field without options", () => {
  assertThrows(() =>
    validateSchemaDefinition({
      schemaType: "t",
      label: "T",
      fields: [{ key: "x", label: "X", type: "enum", options: [] }],
    })
  );
});

Deno.test("validateSchemaDefinition: requires at least one field", () => {
  assertThrows(() =>
    validateSchemaDefinition({ schemaType: "t", label: "T", fields: [] })
  );
});

Deno.test("validateSchemaDefinition: trims labels and drops empty enum options", () => {
  const out = validateSchemaDefinition({
    schemaType: "t",
    label: "  T  ",
    fields: [
      { key: "x", label: "  X  ", type: "enum", options: ["a", "", "  ", "b"] },
    ],
  });
  assertEquals(out.label, "T");
  assertEquals(out.fields[0].label, "X");
  assertEquals(out.fields[0].options, ["a", "b"]);
});
