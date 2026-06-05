/**
 * Integration tests for POST /login.
 *
 * These tests instantiate the login handler directly (not via a running server)
 * to keep them fast and avoid network dependencies.
 */
import { assertEquals, assertMatch } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { createUser } from "@/lib/auth/userRepo.ts";
import { hashPassword } from "@/lib/auth/password.ts";
import { handleLoginPost } from "@/lib/auth/loginHandler.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const SESSION_KEY = "a".repeat(64); // 32-byte hex

Deno.test("POST /login: success sets session cookie and creates a session", async () => {
  await withKv(async () => {
    const hash = await hashPassword("correct");
    await createUser("alice", hash);

    const resp = await handleLoginPost(
      { username: "alice", password: "correct", ip: "127.0.0.1" },
      SESSION_KEY,
    );

    assertEquals(resp.success, true);
    assertMatch(resp.cookie ?? "", /servus_session=/);
    assertMatch(resp.cookie ?? "", /HttpOnly/);
    assertMatch(resp.cookie ?? "", /Secure/);
    assertMatch(resp.cookie ?? "", /SameSite=Strict/);
  });
});

Deno.test("POST /login: cookie includes Max-Age aligned with absolute session timeout", async () => {
  await withKv(async () => {
    const hash = await hashPassword("correct");
    await createUser("persist", hash);

    const resp = await handleLoginPost(
      { username: "persist", password: "correct", ip: "127.0.0.1" },
      SESSION_KEY,
    );

    assertEquals(resp.success, true);
    // 60 days absolute timeout = 5184000 seconds
    assertMatch(resp.cookie ?? "", /Max-Age=5184000/);
    assertMatch(resp.cookie ?? "", /Path=\//);
  });
});

Deno.test("POST /login: wrong password returns failure", async () => {
  await withKv(async () => {
    const hash = await hashPassword("correct");
    await createUser("bob", hash);

    const resp = await handleLoginPost(
      { username: "bob", password: "wrong", ip: "127.0.0.1" },
      SESSION_KEY,
    );

    assertEquals(resp.success, false);
    assertEquals(resp.cookie, undefined);
  });
});

Deno.test("POST /login: unknown username returns same failure shape (no enumeration)", async () => {
  await withKv(async () => {
    const resp = await handleLoginPost(
      { username: "nobody", password: "anything", ip: "127.0.0.1" },
      SESSION_KEY,
    );

    assertEquals(resp.success, false);
    assertEquals(resp.cookie, undefined);
    // Must not leak whether user exists
    assertEquals(resp.userExists, undefined);
  });
});

Deno.test("POST /login: rate-limited IP returns 429 result", async () => {
  await withKv(async () => {
    // Exhaust the IP rate limit (10 failures)
    for (let i = 0; i < 10; i++) {
      await handleLoginPost(
        { username: "noone", password: "bad", ip: "99.0.0.1" },
        SESSION_KEY,
      );
    }
    const resp = await handleLoginPost(
      { username: "noone", password: "bad", ip: "99.0.0.1" },
      SESSION_KEY,
    );
    assertEquals(resp.limited, true);
    assertEquals(typeof resp.retryAfterSeconds, "number");
  });
});

Deno.test("POST /login constant-time: unknown user increments IP counter", async () => {
  await withKv(async () => {
    // Submit 10 attempts with unknown username to saturate IP counter
    for (let i = 0; i < 10; i++) {
      await handleLoginPost(
        { username: "ghost", password: "x", ip: "10.0.0.1" },
        SESSION_KEY,
      );
    }
    const resp = await handleLoginPost(
      { username: "ghost", password: "x", ip: "10.0.0.1" },
      SESSION_KEY,
    );
    // IP counter should have been incremented, now limited
    assertEquals(resp.limited, true);
  });
});
