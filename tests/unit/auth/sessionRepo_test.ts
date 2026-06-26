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
    const s = await createSession("alice", "csrf-token-abc", "admin");
    assertExists(s.sessionId);
    assertEquals(s.username, "alice");
    assertEquals(s.csrfToken, "csrf-token-abc");
    assertEquals(typeof s.createdAt, "number");
    assertEquals(s.lastSeen, s.createdAt);
  });
});

Deno.test("findSession returns stored session by id", async () => {
  await withKv(async () => {
    const s = await createSession("bob", "csrf-xyz", "admin");
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

Deno.test("findSession reads with strong consistency", async () => {
  await withKv(async () => {
    const s = await createSession("strong", "csrf", "admin");

    // Intercept kv.get on the cached client to observe options passed by
    // findSession. The interception is per-test (withKv closes the kv after).
    const kvMod = await import("@/lib/kv/client.ts");
    const kv = await kvMod.getKv();
    const seenOptions: ({ consistency?: string } | undefined)[] = [];
    const originalGet = kv.get.bind(kv);
    (kv as { get: typeof kv.get }).get = ((
      key: Deno.KvKey,
      opts?: { consistency?: "strong" | "eventual" },
    ) => {
      seenOptions.push(opts);
      return originalGet(key, opts);
    }) as typeof kv.get;

    await findSession(s.sessionId);

    assertEquals(seenOptions.length, 1);
    assertEquals(seenOptions[0]?.consistency, "strong");
  });
});

Deno.test("deleteSession removes the session record", async () => {
  await withKv(async () => {
    const s = await createSession("carol", "csrf", "admin");
    await deleteSession(s.sessionId, "carol");
    const found = await findSession(s.sessionId);
    assertEquals(found, null);
  });
});

Deno.test("listSessionsForUser returns all session ids for a user", async () => {
  await withKv(async () => {
    const s1 = await createSession("dave", "csrf1", "admin");
    const s2 = await createSession("dave", "csrf2", "admin");
    const ids = await listSessionsForUser("dave");
    assertEquals(ids.length, 2);
    const idSet = new Set(ids);
    assertEquals(idSet.has(s1.sessionId), true);
    assertEquals(idSet.has(s2.sessionId), true);
  });
});

Deno.test("touchSession updates lastSeen if throttle window has passed", async () => {
  await withKv(async () => {
    const s = await createSession("eve", "csrf", "admin");
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
    const s = await createSession("frank", "csrf", "admin");
    const originalLastSeen = s.lastSeen;
    // Touch immediately (within the 1-hour throttle window)
    await touchSession(s.sessionId);
    const after = await findSession(s.sessionId);
    assertExists(after);
    assertEquals(after.lastSeen, originalLastSeen);
  });
});
