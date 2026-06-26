import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "preact-render-to-string";
import { BottomNav } from "@/components/BottomNav.tsx";
import { MehrMenu } from "@/routes/mehr.tsx";

Deno.test("BottomNav: contains the four primary entries", () => {
  const html = renderToString(<BottomNav path="/items" />);
  assertStringIncludes(html, 'href="/items"');
  assertStringIncludes(html, 'href="/boxes"');
  assertStringIncludes(html, 'href="/items/quick-add"');
  assertStringIncludes(html, 'href="/mehr"');
});

Deno.test("BottomNav: excludes secondary destinations and logout", () => {
  const html = renderToString(<BottomNav path="/items" />);
  assertEquals(html.includes('href="/categories"'), false);
  assertEquals(html.includes('href="/rooms"'), false);
  assertEquals(html.includes('action="/logout"'), false);
});

Deno.test("BottomNav: marks the active tab", () => {
  const html = renderToString(<BottomNav path="/mehr" />);
  assertStringIncludes(html, "nav-active");
});

Deno.test("MehrMenu: lists secondary destinations for admin", () => {
  const html = renderToString(<MehrMenu csrfToken="tok" isAdmin />);
  assertStringIncludes(html, 'href="/categories"');
  assertStringIncludes(html, 'href="/rooms"');
  assertStringIncludes(html, 'href="/admin"');
});

Deno.test("MehrMenu: includes a CSRF-protected logout form and theme control", () => {
  const html = renderToString(<MehrMenu csrfToken="tok-123" isAdmin />);
  assertStringIncludes(html, 'action="/logout"');
  assertStringIncludes(html, 'name="csrf_token"');
  assertStringIncludes(html, 'value="tok-123"');
  assertStringIncludes(html, "data-theme-toggle");
});

Deno.test("MehrMenu: hides Verwaltung link for non-admin users", () => {
  const html = renderToString(<MehrMenu csrfToken="tok" isAdmin={false} />);
  assertEquals(html.includes('href="/admin"'), false);
});

Deno.test("MehrMenu: shows Verwaltung link for admin users", () => {
  const html = renderToString(<MehrMenu csrfToken="tok" isAdmin />);
  assertStringIncludes(html, 'href="/admin"');
});
