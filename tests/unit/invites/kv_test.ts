import { assertEquals, assertExists } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  createInvite,
  deleteInviteById,
  getInviteByCode,
  getInviteById,
  listOutstandingInvites,
} from "@/lib/invites/kv.ts";
import type { Invite } from "@/lib/invites/types.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

function makeInvite(overrides?: Partial<Invite>): Invite {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    hashedCode: "$argon2id$v=19$m=65536,t=3,p=1$fakesalt$fakehash",
    codeLookup: "abc123def456",
    expiry: now + 7 * 24 * 60 * 60 * 1000,
    createdAt: now,
    ...overrides,
  };
}

Deno.test("createInvite stores the invite by primary key", async () => {
  await withKv(async () => {
    const invite = makeInvite();
    await createInvite(invite);
    const found = await getInviteById(invite.id);
    assertExists(found);
    assertEquals(found.id, invite.id);
    assertEquals(found.hashedCode, invite.hashedCode);
  });
});

Deno.test("getInviteById returns null for unknown id", async () => {
  await withKv(async () => {
    const result = await getInviteById("no-such-id");
    assertEquals(result, null);
  });
});

Deno.test("getInviteByCode looks up invite via codeLookup index", async () => {
  await withKv(async () => {
    const invite = makeInvite({ codeLookup: "lookup-key-xyz" });
    await createInvite(invite);
    const found = await getInviteByCode("lookup-key-xyz");
    assertExists(found);
    assertEquals(found.id, invite.id);
  });
});

Deno.test("getInviteByCode returns null for unknown lookup key", async () => {
  await withKv(async () => {
    const result = await getInviteByCode("no-such-lookup");
    assertEquals(result, null);
  });
});

Deno.test("listOutstandingInvites returns non-expired invites", async () => {
  await withKv(async () => {
    const future = makeInvite({ codeLookup: "future" });
    const past = makeInvite({
      codeLookup: "past",
      expiry: Date.now() - 1000,
    });
    await createInvite(future);
    await createInvite(past);

    const list = await listOutstandingInvites();
    assertEquals(list.length, 1);
    assertEquals(list[0].id, future.id);
  });
});

Deno.test("listOutstandingInvites returns empty when all expired", async () => {
  await withKv(async () => {
    const past = makeInvite({
      codeLookup: "past2",
      expiry: Date.now() - 1000,
    });
    await createInvite(past);
    const list = await listOutstandingInvites();
    assertEquals(list.length, 0);
  });
});

Deno.test("deleteInviteById removes the invite", async () => {
  await withKv(async () => {
    const invite = makeInvite({ codeLookup: "to-delete" });
    await createInvite(invite);
    await deleteInviteById(invite.id);
    const found = await getInviteById(invite.id);
    assertEquals(found, null);
  });
});

Deno.test("deleteInviteById also removes the code lookup index", async () => {
  await withKv(async () => {
    const invite = makeInvite({ codeLookup: "index-to-delete" });
    await createInvite(invite);
    await deleteInviteById(invite.id);
    const found = await getInviteByCode("index-to-delete");
    assertEquals(found, null);
  });
});

Deno.test("deleteInviteById is a no-op for unknown id", async () => {
  await withKv(async () => {
    // Should not throw
    await deleteInviteById("ghost-id");
  });
});
