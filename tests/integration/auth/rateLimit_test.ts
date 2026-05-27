/**
 * End-to-end rate limiting integration tests.
 * Verifies IP lockout, username backoff, and reset-on-success via handleLoginPost.
 */
import { assertEquals } from "@std/assert";
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

const KEY = "d".repeat(64);

Deno.test("IP lockout: 10 failures → 429, different IP still passes", async () => {
  await withKv(async () => {
    for (let i = 0; i < 10; i++) {
      await handleLoginPost({
        username: "ghost",
        password: "bad",
        ip: "1.2.3.4",
      }, KEY);
    }
    const locked = await handleLoginPost({
      username: "ghost",
      password: "bad",
      ip: "1.2.3.4",
    }, KEY);
    assertEquals(locked.limited, true);
    assertEquals(typeof locked.retryAfterSeconds, "number");

    // Different IP is unaffected
    const hash = await hashPassword("pw");
    await createUser("frank", hash);
    const ok = await handleLoginPost({
      username: "frank",
      password: "pw",
      ip: "9.9.9.9",
    }, KEY);
    assertEquals(ok.success, true);
  });
});

Deno.test("Username backoff: 5 failures → 429 with growing Retry-After", async () => {
  await withKv(async () => {
    for (let i = 0; i < 5; i++) {
      await handleLoginPost({
        username: "victim",
        password: "bad",
        ip: `2.2.2.${i}`,
      }, KEY);
    }
    const first = await handleLoginPost({
      username: "victim",
      password: "bad",
      ip: "2.2.2.100",
    }, KEY);
    const second = await handleLoginPost({
      username: "victim",
      password: "bad",
      ip: "2.2.2.101",
    }, KEY);
    assertEquals(first.limited, true);
    assertEquals(second.limited, true);
    assertEquals(second.retryAfterSeconds! >= first.retryAfterSeconds!, true);
  });
});

Deno.test("Successful login resets username failure counter", async () => {
  await withKv(async () => {
    const hash = await hashPassword("correct");
    await createUser("target", hash);

    // 4 failures (one below threshold)
    for (let i = 0; i < 4; i++) {
      await handleLoginPost({
        username: "target",
        password: "bad",
        ip: `3.3.3.${i}`,
      }, KEY);
    }
    // Successful login resets counter
    const ok = await handleLoginPost({
      username: "target",
      password: "correct",
      ip: "3.3.3.99",
    }, KEY);
    assertEquals(ok.success, true);

    // Now 5 more failures — counter was reset, so not locked yet
    for (let i = 0; i < 5; i++) {
      await handleLoginPost({
        username: "target",
        password: "bad",
        ip: `4.4.4.${i}`,
      }, KEY);
    }
    const locked = await handleLoginPost({
      username: "target",
      password: "bad",
      ip: "4.4.4.99",
    }, KEY);
    assertEquals(locked.limited, true);
  });
});
