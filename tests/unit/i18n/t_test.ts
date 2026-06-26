import { assertEquals } from "@std/assert";
import { count } from "@/lib/i18n/t.ts";

Deno.test("count: singular", () => {
  assertEquals(count(1, "Gegenstand", "Gegenstände"), "1 Gegenstand");
});

Deno.test("count: plural", () => {
  assertEquals(count(3, "Gegenstand", "Gegenstände"), "3 Gegenstände");
});

Deno.test("count: zero uses plural", () => {
  assertEquals(count(0, "Gegenstand", "Gegenstände"), "0 Gegenstände");
});
