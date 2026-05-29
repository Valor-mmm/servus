import { assertEquals, assertMatch } from "@std/assert";
import { hashPassword, verifyPassword } from "@/lib/auth/password.ts";

Deno.test("hashPassword returns a PHC-format Argon2id string", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assertMatch(hash, /^\$argon2id\$v=19\$/);
});

Deno.test("hashPassword output does not contain the plaintext password", async () => {
  const plaintext = "my-secret-password";
  const hash = await hashPassword(plaintext);
  assertEquals(hash.includes(plaintext), false);
});

Deno.test("verifyPassword returns true for the correct password", async () => {
  const hash = await hashPassword("p1");
  const ok = await verifyPassword(hash, "p1");
  assertEquals(ok, true);
});

Deno.test("verifyPassword returns false for the wrong password", async () => {
  const hash = await hashPassword("p1");
  const ok = await verifyPassword(hash, "p1-wrong");
  assertEquals(ok, false);
});

Deno.test("two hashes of the same password are different (unique salts)", async () => {
  const h1 = await hashPassword("same");
  const h2 = await hashPassword("same");
  assertEquals(h1 === h2, false);
});
