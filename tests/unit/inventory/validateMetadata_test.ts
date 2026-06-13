import { assertEquals, assertThrows } from "@std/assert";
import { getSchema } from "@/lib/inventory/schemas.ts";
import { validateMetadata } from "@/lib/inventory/validateMetadata.ts";

Deno.test("validateMetadata: conforming values are kept and typed", () => {
  const out = validateMetadata(getSchema("book"), {
    author: "  Tolkien  ",
    year: "1954",
    isbn: "978-3",
  });
  assertEquals(out.author, "Tolkien"); // trimmed
  assertEquals(out.year, 1954); // coerced to number
  assertEquals(out.isbn, "978-3");
});

Deno.test("validateMetadata: keys outside the schema are dropped", () => {
  const out = validateMetadata(getSchema("book"), {
    author: "Tolkien",
    bogus: "nope",
  });
  assertEquals("bogus" in out, false);
  assertEquals(out.author, "Tolkien");
});

Deno.test("validateMetadata: empty / absent fields are omitted (no nulls)", () => {
  const out = validateMetadata(getSchema("book"), {
    author: "   ",
    isbn: "",
  });
  assertEquals(Object.keys(out).length, 0);
});

Deno.test("validateMetadata: non-numeric value for a number field is rejected", () => {
  assertThrows(() =>
    validateMetadata(getSchema("book"), { year: "not-a-year" })
  );
});

Deno.test("validateMetadata: out-of-list enum value is rejected", () => {
  assertThrows(() => validateMetadata(getSchema("tool"), { power: "steam" }));
});

Deno.test("validateMetadata: valid enum value is kept", () => {
  const out = validateMetadata(getSchema("tool"), {
    power: "option.power.cordless",
  });
  assertEquals(out.power, "option.power.cordless");
});

Deno.test("validateMetadata: boolean coercion from form strings", () => {
  const yes = validateMetadata(getSchema("toy"), { complete: "true" });
  assertEquals(yes.complete, true);
  const no = validateMetadata(getSchema("toy"), { complete: "false" });
  assertEquals(no.complete, false);
});

Deno.test("validateMetadata: date must be an ISO calendar date", () => {
  // book has no date field; use a synthetic schema-like via furniture? none has date.
  // Validate the date branch through a hand-built schema.
  const schema = {
    schemaType: "x",
    label: "x",
    fields: [{ key: "d", label: "field.d", type: "date" as const }],
  };
  assertEquals(validateMetadata(schema, { d: "2026-06-13" }).d, "2026-06-13");
  assertThrows(() => validateMetadata(schema, { d: "13.06.2026" }));
});

Deno.test("validateMetadata: generic schema yields empty metadata", () => {
  const out = validateMetadata(getSchema("generic"), { anything: "x" });
  assertEquals(Object.keys(out).length, 0);
});
