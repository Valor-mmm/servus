import { assertEquals, assertMatch, assertNotEquals } from "@std/assert";
import { generateInviteCode } from "@/lib/invites/generate.ts";

Deno.test("generateInviteCode returns a base64url raw code of at least 27 chars (≥160 bits)", async () => {
  const { rawCode } = await generateInviteCode();
  // 20 bytes → 27 base64url chars (no padding)
  assertMatch(rawCode, /^[A-Za-z0-9_-]{27,}$/);
});

Deno.test("generateInviteCode returns a valid argon2id encoded hash", async () => {
  const { hashedCode } = await generateInviteCode();
  assertMatch(hashedCode, /^\$argon2id\$/);
});

Deno.test("generateInviteCode returns a codeLookup (sha256 hex, 64 chars)", async () => {
  const { codeLookup } = await generateInviteCode();
  assertMatch(codeLookup, /^[0-9a-f]{64}$/);
});

Deno.test("generateInviteCode rawCode is not stored in hashedCode", async () => {
  const { rawCode, hashedCode } = await generateInviteCode();
  assertEquals(hashedCode.includes(rawCode), false);
});

Deno.test("generateInviteCode produces unique codes on each call", async () => {
  const a = await generateInviteCode();
  const b = await generateInviteCode();
  assertNotEquals(a.rawCode, b.rawCode);
  assertNotEquals(a.hashedCode, b.hashedCode);
  assertNotEquals(a.codeLookup, b.codeLookup);
});

Deno.test("generateInviteCode codeLookup is deterministic for the same rawCode", async () => {
  const { rawCode, codeLookup } = await generateInviteCode();
  const { computeLookup } = await import("@/lib/invites/generate.ts");
  const recomputed = await computeLookup(rawCode);
  assertEquals(recomputed, codeLookup);
});
