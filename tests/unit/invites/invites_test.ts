import { assertEquals, assertExists, assertMatch } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  consumeInvite,
  mintInvite,
  revokeInvite,
} from "@/lib/invites/index.ts";
import { getInviteById } from "@/lib/invites/kv.ts";

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

Deno.test("mintInvite returns raw code (base64url) and stores the invite", async () => {
  await withKv(async () => {
    const { rawCode, invite } = await mintInvite(7);
    assertMatch(rawCode, /^[A-Za-z0-9_-]{27,}$/);
    assertExists(invite.id);
    const stored = await getInviteById(invite.id);
    assertExists(stored);
    assertEquals(stored.id, invite.id);
  });
});

Deno.test("mintInvite expiry is approximately expireDays days from now", async () => {
  await withKv(async () => {
    const before = Date.now();
    const { invite } = await mintInvite(3);
    const after = Date.now();
    const expectedMin = before + 3 * 24 * 60 * 60 * 1000;
    const expectedMax = after + 3 * 24 * 60 * 60 * 1000;
    assertEquals(invite.expiry >= expectedMin, true);
    assertEquals(invite.expiry <= expectedMax, true);
  });
});

Deno.test("revokeInvite deletes the invite record", async () => {
  await withKv(async () => {
    const { invite } = await mintInvite(7);
    await revokeInvite(invite.id);
    const found = await getInviteById(invite.id);
    assertEquals(found, null);
  });
});

Deno.test("consumeInvite with valid code creates session cookie and deletes invite", async () => {
  await withKv(async () => {
    const { rawCode, invite } = await mintInvite(7);
    const result = await consumeInvite(rawCode, TEST_SESSION_KEY);
    assertEquals(result.ok, true);
    if (!result.ok) return;
    assertMatch(result.cookie, /servus_session=/);
    assertExists(result.csrfToken);
    const leftover = await getInviteById(invite.id);
    assertEquals(leftover, null);
  });
});

Deno.test("consumeInvite with expired code returns not_found", async () => {
  await withKv(async () => {
    const { rawCode } = await mintInvite(-1);
    const result = await consumeInvite(rawCode, TEST_SESSION_KEY);
    assertEquals(result.ok, false);
    if (!result.ok) assertEquals(result.reason, "not_found");
  });
});

Deno.test("consumeInvite with unknown code returns not_found", async () => {
  await withKv(async () => {
    const result = await consumeInvite("nonexistentcode", TEST_SESSION_KEY);
    assertEquals(result.ok, false);
    if (!result.ok) assertEquals(result.reason, "not_found");
  });
});

Deno.test("consumeInvite with already-used code returns not_found", async () => {
  await withKv(async () => {
    const { rawCode } = await mintInvite(7);
    await consumeInvite(rawCode, TEST_SESSION_KEY);
    const result = await consumeInvite(rawCode, TEST_SESSION_KEY);
    assertEquals(result.ok, false);
  });
});
