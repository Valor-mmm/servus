import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "preact-render-to-string";
import {
  readMetadataFromForm,
  SchemaFields,
} from "@/components/SchemaFields.tsx";
import { getSchema } from "@/lib/inventory/schemas.ts";

Deno.test("SchemaFields: renders a typed schema's fields in order, pre-filled", () => {
  const html = renderToString(
    <SchemaFields
      schema={getSchema("book")}
      metadata={{ author: "Tolkien", year: 1937 }}
    />,
  );
  const authorIdx = html.indexOf('name="meta.author"');
  const yearIdx = html.indexOf('name="meta.year"');
  assertEquals(authorIdx >= 0, true);
  assertEquals(yearIdx > authorIdx, true);
  assertStringIncludes(html, "Tolkien");
  assertStringIncludes(html, "1937");
  // book has no enum field
  assertEquals(html.includes("<select"), false);
});

Deno.test("SchemaFields: enum field renders a select with options", () => {
  const html = renderToString(
    <SchemaFields schema={getSchema("tool")} metadata={{}} />,
  );
  assertStringIncludes(html, '<select name="meta.power"');
  assertStringIncludes(html, "Akku"); // option.power.cordless label
});

Deno.test("SchemaFields: boolean field renders a checkbox, checked when true", () => {
  const html = renderToString(
    <SchemaFields schema={getSchema("toy")} metadata={{ complete: true }} />,
  );
  assertStringIncludes(html, 'type="checkbox"');
  assertStringIncludes(html, 'name="meta.complete"');
  assertStringIncludes(html, "checked");
});

Deno.test("SchemaFields: generic schema renders nothing", () => {
  const html = renderToString(
    <SchemaFields schema={getSchema("generic")} metadata={{}} />,
  );
  assertEquals(html, "");
});

Deno.test("readMetadataFromForm: collects only meta.* keys, stripped of prefix", () => {
  const form = new FormData();
  form.set("name", "Buch");
  form.set("meta.author", "Tolkien");
  form.set("meta.year", "1937");
  const out = readMetadataFromForm(form);
  assertEquals(out, { author: "Tolkien", year: "1937" });
});
