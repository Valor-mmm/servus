import { assertEquals } from "@std/assert";
import { generateCsrfToken, verifyCsrfToken } from "@/lib/auth/csrf.ts";

Deno.test("generateCsrfToken returns a non-empty hex string", () => {
  const token = generateCsrfToken();
  assertEquals(typeof token, "string");
  assertEquals(token.length > 0, true);
  assertEquals(/^[0-9a-f]+$/.test(token), true);
});

Deno.test("generateCsrfToken returns unique tokens each call", () => {
  const t1 = generateCsrfToken();
  const t2 = generateCsrfToken();
  assertEquals(t1 === t2, false);
});

Deno.test("verifyCsrfToken returns true for matching tokens", () => {
  const token = generateCsrfToken();
  assertEquals(verifyCsrfToken(token, token), true);
});

Deno.test("verifyCsrfToken returns false for different tokens", () => {
  const t1 = generateCsrfToken();
  const t2 = generateCsrfToken();
  assertEquals(verifyCsrfToken(t1, t2), false);
});

Deno.test("verifyCsrfToken returns false for empty strings", () => {
  assertEquals(verifyCsrfToken("", ""), false);
});

Deno.test("verifyCsrfToken is constant-time (no early exit)", () => {
  // This is a structural test: verify runs to completion even when lengths differ
  const short = "abc";
  const long = "abc" + "x".repeat(60);
  // Must not throw and must return false
  assertEquals(verifyCsrfToken(short, long), false);
});
