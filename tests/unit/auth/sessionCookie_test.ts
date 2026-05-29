import { assertEquals } from "@std/assert";
import {
  signSessionId,
  verifySessionCookie,
} from "@/lib/auth/sessionCookie.ts";

const KEY = "0".repeat(64); // 32-byte hex key for tests

Deno.test("signSessionId returns a string containing the id", async () => {
  const id = "abc123";
  const cookie = await signSessionId(id, KEY);
  assertEquals(cookie.includes(id), true);
});

Deno.test("verifySessionCookie returns the session id for a valid cookie", async () => {
  const id = "deadbeef1234";
  const cookie = await signSessionId(id, KEY);
  const result = await verifySessionCookie(cookie, KEY);
  assertEquals(result, id);
});

Deno.test("verifySessionCookie returns null for a tampered cookie", async () => {
  const id = "validid";
  const cookie = await signSessionId(id, KEY);
  const tampered = cookie.slice(0, -4) + "xxxx";
  const result = await verifySessionCookie(tampered, KEY);
  assertEquals(result, null);
});

Deno.test("verifySessionCookie returns null for a malformed cookie", async () => {
  const result = await verifySessionCookie("not-a-valid-cookie", KEY);
  assertEquals(result, null);
});

Deno.test("verifySessionCookie returns null for an empty string", async () => {
  const result = await verifySessionCookie("", KEY);
  assertEquals(result, null);
});
