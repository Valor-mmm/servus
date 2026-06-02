import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  checkAndIncrementIp,
  checkAndIncrementUser,
  resetUserFailures,
} from "@/lib/auth/rateLimitRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

// IP rate limit: 30 failures per 15-minute sliding window

Deno.test("checkAndIncrementIp allows first attempt", async () => {
  await withKv(async () => {
    const result = await checkAndIncrementIp("1.2.3.4", "session-key");
    assertEquals(result.limited, false);
  });
});

Deno.test("checkAndIncrementIp blocks after 30 failures", async () => {
  await withKv(async () => {
    for (let i = 0; i < 30; i++) {
      await checkAndIncrementIp("5.6.7.8", "session-key");
    }
    const result = await checkAndIncrementIp("5.6.7.8", "session-key");
    assertEquals(result.limited, true);
    assertEquals(typeof result.retryAfterSeconds, "number");
    assertEquals(result.retryAfterSeconds! > 0, true);
  });
});

Deno.test("checkAndIncrementIp uses hashed IP (different IPs are independent)", async () => {
  await withKv(async () => {
    for (let i = 0; i < 30; i++) {
      await checkAndIncrementIp("10.0.0.1", "session-key");
    }
    // Different IP should still be allowed
    const result = await checkAndIncrementIp("10.0.0.2", "session-key");
    assertEquals(result.limited, false);
  });
});

// Username rate limit: 5 failures per 1-hour window with exponential backoff

Deno.test("checkAndIncrementUser allows first attempt", async () => {
  await withKv(async () => {
    const result = await checkAndIncrementUser("alice");
    assertEquals(result.limited, false);
  });
});

Deno.test("checkAndIncrementUser blocks after 5 failures", async () => {
  await withKv(async () => {
    for (let i = 0; i < 5; i++) {
      await checkAndIncrementUser("bob");
    }
    const result = await checkAndIncrementUser("bob");
    assertEquals(result.limited, true);
    assertEquals(typeof result.retryAfterSeconds, "number");
    assertEquals(result.retryAfterSeconds! > 0, true);
  });
});

Deno.test("checkAndIncrementUser applies exponential backoff beyond threshold", async () => {
  await withKv(async () => {
    for (let i = 0; i < 5; i++) {
      await checkAndIncrementUser("carol");
    }
    const first = await checkAndIncrementUser("carol");
    const second = await checkAndIncrementUser("carol");
    assertEquals(first.limited, true);
    assertEquals(second.limited, true);
    // Second penalty must be at least as large as first
    assertEquals(second.retryAfterSeconds! >= first.retryAfterSeconds!, true);
  });
});

Deno.test("resetUserFailures clears the username counter", async () => {
  await withKv(async () => {
    for (let i = 0; i < 5; i++) {
      await checkAndIncrementUser("dave");
    }
    await resetUserFailures("dave");
    const result = await checkAndIncrementUser("dave");
    assertEquals(result.limited, false);
  });
});
