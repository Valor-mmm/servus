import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { seedUsers } from "@/lib/auth/seed.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("seedUsers does not log or return plaintext passwords", async () => {
  await withKv(async () => {
    // Capture any console output
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      await seedUsers([{ username: "alice", password: "super-secret" }]);
    } finally {
      console.log = orig;
    }
    // No log line should include the plaintext password
    for (const line of logs) {
      assertEquals(
        line.includes("super-secret"),
        false,
        `Log line contained plaintext password: ${line}`,
      );
    }
  });
});
