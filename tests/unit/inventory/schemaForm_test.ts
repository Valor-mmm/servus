import { assertEquals } from "@std/assert";
import {
  readSchemaInputFromForm,
  slugifyKey,
  slugifySchemaType,
} from "@/lib/inventory/schemaForm.ts";

Deno.test("slugifyKey: lowercases, strips, maps umlauts", () => {
  assertEquals(slugifyKey("Lieblingsfarbe", 0), "lieblingsfarbe");
  assertEquals(slugifyKey("Größe", 0), "groesse");
  assertEquals(slugifyKey("Anzahl Teile", 0), "anzahlteile");
});

Deno.test("slugifyKey: falls back when no leading letter", () => {
  assertEquals(slugifyKey("123", 2), "field2");
  assertEquals(slugifyKey("✓", 4), "field4");
});

Deno.test("slugifySchemaType: produces a hyphen slug", () => {
  assertEquals(slugifySchemaType("Pflanze"), "pflanze");
  assertEquals(slugifySchemaType("Mein Möbel Typ"), "mein-moebel-typ");
});

Deno.test("readSchemaInputFromForm: builds input, skips empty rows, derives keys", () => {
  const form = new FormData();
  form.set("name", "Pflanze");
  form.set("field_label_0", "Art");
  form.set("field_type_0", "text");
  form.set("field_label_1", ""); // skipped
  form.set("field_type_1", "text");
  form.set("field_label_2", "Standort");
  form.set("field_type_2", "enum");
  form.set("field_options_2", "Innen\nAußen\n\n  ");

  const input = readSchemaInputFromForm(form, "pflanze");
  assertEquals(input.schemaType, "pflanze");
  assertEquals(input.label, "Pflanze");
  assertEquals(input.fields.length, 2);
  assertEquals(input.fields[0], {
    key: "art",
    label: "Art",
    type: "text",
    options: undefined,
  });
  assertEquals(input.fields[1].key, "standort");
  assertEquals(input.fields[1].options, ["Innen", "Außen"]);
});

Deno.test("readSchemaInputFromForm: preserves existing field keys", () => {
  const form = new FormData();
  form.set("name", "Buch");
  form.set("field_label_0", "Autor");
  form.set("field_type_0", "text");
  form.set("field_key_0", "author"); // existing camelCase key preserved
  const input = readSchemaInputFromForm(form, "book");
  assertEquals(input.fields[0].key, "author");
});

Deno.test("readSchemaInputFromForm: de-duplicates derived keys", () => {
  const form = new FormData();
  form.set("name", "T");
  form.set("field_label_0", "Farbe");
  form.set("field_type_0", "text");
  form.set("field_label_1", "Farbe");
  form.set("field_type_1", "text");
  const input = readSchemaInputFromForm(form, "t");
  assertEquals(input.fields[0].key, "farbe");
  assertEquals(input.fields[1].key === "farbe", false);
});
