import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "preact-render-to-string";
import GroupReorder from "@/islands/GroupReorder.tsx";
import { MehrMenu } from "@/routes/mehr.tsx";

const members = [
  { id: "a", name: "Zelt" },
  { id: "b", name: "Schlafsack" },
  { id: "c", name: "Kocher" },
];

Deno.test("GroupReorder: renders members in given order with a save action", () => {
  const html = renderToString(
    <GroupReorder groupId="g1" members={members} csrfToken="x" />,
  );
  const zelt = html.indexOf("Zelt");
  const sack = html.indexOf("Schlafsack");
  const kocher = html.indexOf("Kocher");
  assertEquals(zelt < sack && sack < kocher, true);
  // persisted order carried in the hidden field for submit
  assertStringIncludes(html, 'name="order"');
  assertStringIncludes(html, 'value="a,b,c"');
  assertStringIncludes(html, 'value="reorder"');
  // members link to their items
  assertStringIncludes(html, 'href="/items/a"');
});

Deno.test("GroupReorder: empty group shows the no-members message", () => {
  const html = renderToString(
    <GroupReorder groupId="g1" members={[]} csrfToken="x" />,
  );
  assertEquals(html.includes('name="order"'), false);
});

Deno.test("MehrMenu: now links to Gruppen", () => {
  const html = renderToString(<MehrMenu csrfToken="x" />);
  assertStringIncludes(html, 'href="/groups"');
});
