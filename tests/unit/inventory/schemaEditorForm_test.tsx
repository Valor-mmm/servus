import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "preact-render-to-string";
import { SchemaEditorForm } from "@/components/SchemaEditorForm.tsx";
import type { CategorySchema } from "@/lib/inventory/types.ts";

const schema: CategorySchema = {
  schemaType: "plant",
  label: "Pflanze",
  fields: [
    { key: "species", label: "Art", type: "text" },
    { key: "location", label: "Standort", type: "enum", options: ["Innen"] },
  ],
};

Deno.test("SchemaEditorForm: renders name + existing fields pre-filled", () => {
  const html = renderToString(
    <SchemaEditorForm
      schema={schema}
      action="/categories/schemas/plant"
      csrfToken="x"
    />,
  );
  assertStringIncludes(html, 'name="name"');
  assertStringIncludes(html, "Pflanze");
  // existing field labels + their hidden keys preserved
  assertStringIncludes(html, 'name="field_label_0"');
  assertStringIncludes(html, "Art");
  assertStringIncludes(html, 'name="field_key_0"');
  assertStringIncludes(html, 'value="species"');
  // enum options pre-filled in the textarea
  assertStringIncludes(html, "Innen");
  // a type select exists
  assertStringIncludes(html, 'name="field_type_0"');
});

Deno.test("SchemaEditorForm: includes spare blank rows for adding fields", () => {
  const html = renderToString(
    <SchemaEditorForm
      schema={schema}
      action="/x"
      csrfToken="x"
      spareRows={3}
    />,
  );
  // 2 existing + 3 spare = rows 0..4
  assertStringIncludes(html, 'name="field_label_4"');
  assertEquals(html.includes('name="field_label_5"'), false);
});

Deno.test("SchemaEditorForm: delete button only when canDelete", () => {
  const without = renderToString(
    <SchemaEditorForm schema={schema} action="/x" csrfToken="x" />,
  );
  assertEquals(without.includes('value="delete"'), false);

  const withDelete = renderToString(
    <SchemaEditorForm
      schema={schema}
      action="/x"
      csrfToken="x"
      canDelete
    />,
  );
  assertStringIncludes(withDelete, 'value="delete"');
});

Deno.test("SchemaEditorForm: new schema (null) renders blank rows only", () => {
  const html = renderToString(
    <SchemaEditorForm
      schema={null}
      action="/categories/schemas/new"
      csrfToken="x"
      spareRows={4}
    />,
  );
  assertStringIncludes(html, 'name="field_label_0"');
  assertStringIncludes(html, 'name="field_label_3"');
  assertEquals(html.includes('name="field_key_0"'), false);
});
