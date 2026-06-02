/**
 * Integration tests for admin invite management.
 * Tests lib/invites functions directly (handler logic is thin).
 */
import { assertEquals, assertExists, assertMatch } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  consumeInvite,
  listOutstandingInvites,
  mintInvite,
  revokeInvite,
} from "@/lib/invites/index.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("GET /admin/invites: returns only non-expired invites", async () => {
  await withKv(async () => {
    const { invite: active } = await mintInvite(7);
    const { invite: expired } = await mintInvite(-1);

    const list = await listOutstandingInvites();
    const ids = list.map((i) => i.id);
    assertEquals(ids.includes(active.id), true);
    assertEquals(ids.includes(expired.id), false);
  });
});

Deno.test("GET /admin/invites: raw code is not exposed in stored invite", async () => {
  await withKv(async () => {
    const { rawCode, invite } = await mintInvite(7);
    assertEquals(invite.hashedCode.includes(rawCode), false);
    assertEquals(invite.codeLookup.includes(rawCode), false);
  });
});

Deno.test("POST /admin/invites: creates invite and returns raw code once", async () => {
  await withKv(async () => {
    const { rawCode, invite } = await mintInvite(7);
    assertMatch(rawCode, /^[A-Za-z0-9_-]{27,}$/);
    assertExists(invite.id);
    assertMatch(invite.hashedCode, /^\$argon2id\$/);
  });
});

Deno.test("POST /admin/invites: expiry days is configurable", async () => {
  await withKv(async () => {
    const before = Date.now();
    const { invite } = await mintInvite(14);
    const after = Date.now();
    const min = before + 14 * 24 * 60 * 60 * 1000;
    const max = after + 14 * 24 * 60 * 60 * 1000;
    assertEquals(invite.expiry >= min, true);
    assertEquals(invite.expiry <= max, true);
  });
});

Deno.test("POST /admin/invites/[id]/revoke: deletes the invite", async () => {
  await withKv(async () => {
    const { invite } = await mintInvite(7);
    await revokeInvite(invite.id);
    const list = await listOutstandingInvites();
    assertEquals(
      list.some((i) => i.id === invite.id),
      false,
    );
  });
});

Deno.test("POST /admin/invites/[id]/revoke: revoked invite cannot be consumed", async () => {
  await withKv(async () => {
    const { rawCode, invite } = await mintInvite(7);
    await revokeInvite(invite.id);
    const result = await consumeInvite(rawCode, "aa".repeat(32));
    assertEquals(result.ok, false);
  });
});
