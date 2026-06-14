import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "preact-render-to-string";
import { ItemGroupsEditor } from "@/components/ItemGroupsEditor.tsx";
import type { Group } from "@/lib/inventory/types.ts";

function group(id: string, name: string): Group {
  return { id, name, note: null, createdAt: 0, updatedAt: 0 };
}

Deno.test("ItemGroupsEditor: renders an add input backed by a datalist of names", () => {
  const html = renderToString(
    <ItemGroupsEditor
      itemId="i1"
      groups={[]}
      allGroupNames={["Campingkram", "Harry Potter"]}
      csrfToken="x"
    />,
  );
  assertStringIncludes(html, 'name="groupName"');
  assertStringIncludes(html, 'list="group-names"');
  assertStringIncludes(html, "<datalist");
  assertStringIncludes(html, 'value="Campingkram"');
  assertStringIncludes(html, 'value="Harry Potter"');
  assertStringIncludes(html, 'value="add_group"');
});

Deno.test("ItemGroupsEditor: renders current groups as removable chips", () => {
  const html = renderToString(
    <ItemGroupsEditor
      itemId="i1"
      groups={[group("g1", "Campingkram")]}
      allGroupNames={["Campingkram"]}
      csrfToken="tok"
    />,
  );
  assertStringIncludes(html, "Campingkram");
  assertStringIncludes(html, 'href="/groups/g1"');
  assertStringIncludes(html, 'value="remove_group"');
  assertStringIncludes(html, 'value="g1"');
});

Deno.test("ItemGroupsEditor: no chip list when the item has no groups", () => {
  const html = renderToString(
    <ItemGroupsEditor
      itemId="i1"
      groups={[]}
      allGroupNames={[]}
      csrfToken="x"
    />,
  );
  assertEquals(html.includes("group-chips"), false);
});
