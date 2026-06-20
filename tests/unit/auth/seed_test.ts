import { assertEquals, assertExists } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { findUser } from "@/lib/auth/userRepo.ts";
import { seedUsers } from "@/lib/auth/seed.ts";
import { verifyPassword } from "@/lib/auth/password.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("seedUsers: empty seed creates no users", async () => {
  await withKv(async () => {
    const { seeded, skipped } = await seedUsers([]);
    assertEquals(seeded, 0);
    assertEquals(skipped, 0);
    assertEquals(await findUser("alice"), null);
  });
});

Deno.test("seedUsers: two-user seed creates both users with hashed passwords", async () => {
  await withKv(async () => {
    const { seeded, skipped } = await seedUsers([
      { username: "alice", password: "pw1" },
      { username: "bob", password: "pw2" },
    ]);
    assertEquals(seeded, 2);
    assertEquals(skipped, 0);

    const alice = await findUser("alice");
    assertExists(alice);
    assertEquals(alice.passwordHash.startsWith("$argon2id$"), true);
    assertEquals(await verifyPassword(alice.passwordHash, "pw1"), true);

    const bob = await findUser("bob");
    assertExists(bob);
    assertEquals(await verifyPassword(bob.passwordHash, "pw2"), true);
  });
});

Deno.test("seedUsers: reboot with existing users skips them", async () => {
  await withKv(async () => {
    await seedUsers([{ username: "carol", password: "p1" }]);
    const { seeded, skipped } = await seedUsers([
      { username: "carol", password: "p1" },
    ]);
    assertEquals(seeded, 0);
    assertEquals(skipped, 1);
  });
});

Deno.test("seedUsers: reboot does NOT overwrite existing hash", async () => {
  await withKv(async () => {
    await seedUsers([{ username: "dave", password: "original" }]);
    const before = await findUser("dave");
    assertExists(before);

    await seedUsers([{ username: "dave", password: "new-password" }]);
    const after = await findUser("dave");
    assertExists(after);

    // Hash must be unchanged — original password still verifies
    assertEquals(await verifyPassword(after.passwordHash, "original"), true);
    assertEquals(
      await verifyPassword(after.passwordHash, "new-password"),
      false,
    );
  });
});

Deno.test("seedUsers: mix of new and existing users", async () => {
  await withKv(async () => {
    await seedUsers([{ username: "existing", password: "p1" }]);
    const { seeded, skipped } = await seedUsers([
      { username: "existing", password: "p1" },
      { username: "fresh", password: "p2" },
    ]);
    assertEquals(seeded, 1);
    assertEquals(skipped, 1);
  });
});

Deno.test("seedUsers: plaintext password is not stored (hash starts with $argon2id$)", async () => {
  await withKv(async () => {
    await seedUsers([{ username: "eve", password: "secret" }]);
    const user = await findUser("eve");
    assertExists(user);
    assertEquals(user.passwordHash.includes("secret"), false);
  });
});

Deno.test("seedUsers: seeded user has role admin", async () => {
  await withKv(async () => {
    await seedUsers([{ username: "owner", password: "pw" }]);
    const user = await findUser("owner");
    assertExists(user);
    assertEquals(user.role, "admin");
  });
});
