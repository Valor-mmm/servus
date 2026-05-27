import { assertEquals, assertMatch } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { findSession } from "@/lib/auth/sessionRepo.ts";
import { handleLoginPost } from "@/lib/auth/loginHandler.ts";
import { handleLogoutPost } from "@/lib/auth/logoutHandler.ts";
import { createUser } from "@/lib/auth/userRepo.ts";
import { hashPassword } from "@/lib/auth/password.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const SESSION_KEY = "b".repeat(64);

Deno.test("POST /logout: deletes session and clears cookie", async () => {
  await withKv(async () => {
    const hash = await hashPassword("pw");
    await createUser("alice", hash);
    const login = await handleLoginPost(
      { username: "alice", password: "pw", ip: "1.1.1.1" },
      SESSION_KEY,
    );
    const { sessionId, csrfToken } = login;

    const result = await handleLogoutPost({
      sessionId: sessionId!,
      username: "alice",
      csrfToken: csrfToken!,
    });

    assertEquals(result.success, true);
    // Session no longer in store
    const session = await findSession(sessionId!);
    assertEquals(session, null);
    // Cookie cleared
    assertMatch(result.clearCookie ?? "", /servus_session=;/);
  });
});

Deno.test("POST /logout: requires valid CSRF token", async () => {
  await withKv(async () => {
    const hash = await hashPassword("pw");
    await createUser("bob", hash);
    const login = await handleLoginPost(
      { username: "bob", password: "pw", ip: "1.1.1.2" },
      SESSION_KEY,
    );

    const result = await handleLogoutPost({
      sessionId: login.sessionId!,
      username: "bob",
      csrfToken: "wrong-token",
    });

    assertEquals(result.success, false);
    assertEquals(result.forbidden, true);
    // Session still exists
    const session = await findSession(login.sessionId!);
    assertEquals(session !== null, true);
  });
});
