import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { checkAndIncrementInviteIp } from "@/lib/invites/rateLimit.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("checkAndIncrementInviteIp allows first attempt", async () => {
  await withKv(async () => {
    const result = await checkAndIncrementInviteIp("1.2.3.4", "session-key");
    assertEquals(result.limited, false);
  });
});

Deno.test("checkAndIncrementInviteIp blocks after threshold", async () => {
  await withKv(async () => {
    // Default threshold is 10
    for (let i = 0; i < 10; i++) {
      await checkAndIncrementInviteIp("5.6.7.8", "session-key");
    }
    const result = await checkAndIncrementInviteIp("5.6.7.8", "session-key");
    assertEquals(result.limited, true);
    assertEquals(typeof result.retryAfterSeconds, "number");
    assertEquals(result.retryAfterSeconds! > 0, true);
  });
});

Deno.test("checkAndIncrementInviteIp uses separate namespace from login rate-limit", async () => {
  await withKv(async () => {
    // Exhaust invite rate limit for one IP
    for (let i = 0; i < 10; i++) {
      await checkAndIncrementInviteIp("9.9.9.9", "session-key");
    }
    const inviteLimited = await checkAndIncrementInviteIp(
      "9.9.9.9",
      "session-key",
    );
    assertEquals(inviteLimited.limited, true);

    // Login rate limit for the same IP should still be independent
    const { checkAndIncrementIp } = await import("@/lib/auth/rateLimitRepo.ts");
    const loginResult = await checkAndIncrementIp("9.9.9.9", "session-key");
    assertEquals(loginResult.limited, false);
  });
});

Deno.test("checkAndIncrementInviteIp different IPs are independent", async () => {
  await withKv(async () => {
    for (let i = 0; i < 10; i++) {
      await checkAndIncrementInviteIp("10.0.0.1", "session-key");
    }
    const result = await checkAndIncrementInviteIp("10.0.0.2", "session-key");
    assertEquals(result.limited, false);
  });
});
