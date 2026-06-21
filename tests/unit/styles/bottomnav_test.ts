import { assertEquals } from "jsr:@std/assert";
import { navActive } from "@/components/BottomNav.tsx";

Deno.test("navActive: exact match", () => {
  assertEquals(navActive("/items", "/items"), true);
});

Deno.test("navActive: sub-route is active", () => {
  assertEquals(navActive("/items/incomplete", "/items"), true);
  assertEquals(navActive("/items/123", "/items"), true);
});

Deno.test("navActive: sibling path not active", () => {
  assertEquals(navActive("/items-extra", "/items"), false);
});

Deno.test("navActive: different root not active", () => {
  assertEquals(navActive("/boxes", "/items"), false);
});
