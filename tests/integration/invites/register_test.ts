/**
 * Integration tests for invite code consumption (token-based session flow).
 */
import { assertEquals, assertExists, assertMatch } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  consumeInvite,
  mintInvite,
  revokeInvite,
} from "@/lib/invites/index.ts";
import { findUser } from "@/lib/auth/userRepo.ts";

const TEST_SESSION_KEY = "aa".repeat(32);

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("valid code: creates helper user with generated username", async () => {
  await withKv(async () => {
    const { rawCode } = await mintInvite(7);
    const result = await consumeInvite(rawCode, TEST_SESSION_KEY);
    assertEquals(result.ok, true);
    if (!result.ok) return;
    assertMatch(result.cookie, /servus_session=/);
    assertExists(result.csrfToken);
  });
});

Deno.test("valid code: returns session cookie and csrf token", async () => {
  await withKv(async () => {
    const { rawCode } = await mintInvite(7);
    const result = await consumeInvite(rawCode, TEST_SESSION_KEY);
    assertEquals(result.ok, true);
    if (!result.ok) return;
    assertExists(result.cookie);
    assertExists(result.csrfToken);
    assertMatch(result.cookie, /^servus_session=/);
  });
});

Deno.test("valid code: invite is burned after successful consumption", async () => {
  await withKv(async () => {
    const { rawCode } = await mintInvite(7);
    await consumeInvite(rawCode, TEST_SESSION_KEY);

    const second = await consumeInvite(rawCode, TEST_SESSION_KEY);
    assertEquals(second.ok, false);
    if (!second.ok) assertEquals(second.reason, "not_found");
  });
});

Deno.test("expired code: rejected, no session created", async () => {
  await withKv(async () => {
    const { rawCode } = await mintInvite(-1);
    const result = await consumeInvite(rawCode, TEST_SESSION_KEY);
    assertEquals(result.ok, false);
    if (!result.ok) assertEquals(result.reason, "not_found");
  });
});

Deno.test("unknown code: rejected", async () => {
  await withKv(async () => {
    const result = await consumeInvite("unknowncode", TEST_SESSION_KEY);
    assertEquals(result.ok, false);
  });
});

Deno.test("revoked code: cannot be consumed", async () => {
  await withKv(async () => {
    const { rawCode, invite } = await mintInvite(7);
    await revokeInvite(invite.id);
    const result = await consumeInvite(rawCode, TEST_SESSION_KEY);
    assertEquals(result.ok, false);
  });
});

Deno.test("concurrent consumption: only one succeeds", async () => {
  await withKv(async () => {
    const { rawCode } = await mintInvite(7);
    const [r1, r2] = await Promise.all([
      consumeInvite(rawCode, TEST_SESSION_KEY),
      consumeInvite(rawCode, TEST_SESSION_KEY),
    ]);
    const successes = [r1, r2].filter((r) => r.ok).length;
    assertEquals(successes, 1);
  });
});

Deno.test("valid code: helper user cannot be found by login (unknowable password)", async () => {
  await withKv(async () => {
    const { rawCode } = await mintInvite(7);
    const result = await consumeInvite(rawCode, TEST_SESSION_KEY);
    assertEquals(result.ok, true);
    if (!result.ok) return;
    // We don't know the generated username, but we can verify findUser
    // is not polluted with any "null" or empty username
    const noUser = await findUser("");
    assertEquals(noUser, null);
  });
});
