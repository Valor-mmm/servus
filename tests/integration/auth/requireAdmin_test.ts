/**
 * Integration test: helper created via invite → requireAdmin returns 403.
 * Tests the full chain: invite consumption sets role:user → requireAdmin blocks.
 */
import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { consumeInvite, mintInvite } from "@/lib/invites/index.ts";
import { requireAdmin } from "@/lib/auth/middleware.ts";
import type { State } from "@/utils.ts";
import type { FreshContext } from "fresh";
import { getKv } from "@/lib/kv/client.ts";
import type { User } from "@/lib/auth/types.ts";

const TEST_SESSION_KEY = "bb".repeat(32);

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

function makeCtx(user: State["user"]): FreshContext<State> {
  return { state: { user } } as unknown as FreshContext<State>;
}

Deno.test("requireAdmin: helper created via invite gets 403", async () => {
  await withKv(async () => {
    const { rawCode } = await mintInvite(7);
    await consumeInvite(rawCode, TEST_SESSION_KEY);

    // Find the created helper user
    const kv = await getKv();
    let helperUser: User | null = null;
    for await (const entry of kv.list<User>({ prefix: ["user"] })) {
      helperUser = entry.value;
    }
    assertEquals(helperUser?.role, "user");

    // Simulate requireAdmin check with helper's role
    const resp = await requireAdmin(
      makeCtx({ username: helperUser!.username, role: helperUser!.role }),
    );
    assertEquals(resp?.status, 403);
  });
});

Deno.test("requireAdmin: admin user (role admin) gets null (pass)", async () => {
  await withKv(async () => {
    const resp = await requireAdmin(
      makeCtx({ username: "owner", role: "admin" }),
    );
    assertEquals(resp, null);
  });
});
