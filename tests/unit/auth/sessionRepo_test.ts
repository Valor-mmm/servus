import { assertEquals, assertExists } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  createSession,
  deleteSession,
  findSession,
  listSessionsForUser,
  touchSession,
} from "@/lib/auth/sessionRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("createSession stores session and returns it", async () => {
  await withKv(async () => {
    const s = await createSession("alice", "csrf-token-abc");
    assertExists(s.sessionId);
    assertEquals(s.username, "alice");
    assertEquals(s.csrfToken, "csrf-token-abc");
    assertEquals(typeof s.createdAt, "number");
    assertEquals(s.lastSeen, s.createdAt);
  });
});

Deno.test("findSession returns stored session by id", async () => {
  await withKv(async () => {
    const s = await createSession("bob", "csrf-xyz");
    const found = await findSession(s.sessionId);
    assertExists(found);
    assertEquals(found.username, "bob");
  });
});

Deno.test("findSession returns null for unknown id", async () => {
  await withKv(async () => {
    const found = await findSession("nonexistent-id");
    assertEquals(found, null);
  });
});

Deno.test("deleteSession removes the session record", async () => {
  await withKv(async () => {
    const s = await createSession("carol", "csrf");
    await deleteSession(s.sessionId, "carol");
    const found = await findSession(s.sessionId);
    assertEquals(found, null);
  });
});

Deno.test("listSessionsForUser returns all session ids for a user", async () => {
  await withKv(async () => {
    const s1 = await createSession("dave", "csrf1");
    const s2 = await createSession("dave", "csrf2");
    const ids = await listSessionsForUser("dave");
    assertEquals(ids.length, 2);
    const idSet = new Set(ids);
    assertEquals(idSet.has(s1.sessionId), true);
    assertEquals(idSet.has(s2.sessionId), true);
  });
});

Deno.test("touchSession updates lastSeen if throttle window has passed", async () => {
  await withKv(async () => {
    const s = await createSession("eve", "csrf");
    // Force lastSeen to be old enough (>1h) by manipulating the record
    const kv = await import("@/lib/kv/client.ts").then((m) => m.getKv());
    const old = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
    await kv.set(["session", s.sessionId], { ...s, lastSeen: old });

    await touchSession(s.sessionId);
    const updated = await findSession(s.sessionId);
    assertExists(updated);
    // lastSeen should now be recent
    assertEquals(updated.lastSeen > old, true);
  });
});

Deno.test("touchSession does NOT update lastSeen within throttle window", async () => {
  await withKv(async () => {
    const s = await createSession("frank", "csrf");
    const originalLastSeen = s.lastSeen;
    // Touch immediately (within the 1-hour throttle window)
    await touchSession(s.sessionId);
    const after = await findSession(s.sessionId);
    assertExists(after);
    assertEquals(after.lastSeen, originalLastSeen);
  });
});
