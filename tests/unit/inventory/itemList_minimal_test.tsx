import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "preact-render-to-string";
import { ItemsPage } from "@/routes/items/index.tsx";
import type { Category, Item } from "@/lib/inventory/types.ts";

const SECRET_META = "SECRET_METADATA_VALUE";

function typedItem(): Item {
  return {
    id: "i1",
    name: "Der Hobbit",
    categoryId: "c1",
    containerId: null,
    roomId: null,
    boxId: null,
    quantity: 1,
    estimatedValue: null,
    warrantyUntil: "2030-01-01",
    metadata: { author: SECRET_META, year: 1937 },
    photos: [],
    status: "complete",
    createdAt: 0,
    updatedAt: 0,
  };
}

const bookCategory: Category = {
  id: "c1",
  name: "Bücher",
  schemaType: "book",
  canContain: false,
  createdAt: 0,
};

Deno.test("item list shows name and category but no schema metadata values", () => {
  const html = renderToString(
    <ItemsPage
      items={[typedItem()]}
      categories={[bookCategory]}
      rooms={[]}
      search=""
      categoryId=""
      roomId=""
      csrfToken="x"
      thumbnailUrls={{}}
      isLimitedView={false}
      totalCount={1}
    />,
  );
  // name + category present
  assertStringIncludes(html, "Der Hobbit");
  assertStringIncludes(html, "Bücher");
  // metadata values must NOT leak into the list
  assertEquals(html.includes(SECRET_META), false);
  assertEquals(html.includes("1937"), false);
  // warranty date must not leak into the list either
  assertEquals(html.includes("2030"), false);
});
