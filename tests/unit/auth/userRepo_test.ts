import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { createUser, findUser } from "@/lib/auth/userRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("createUser stores a user with hashed password", async () => {
  await withKv(async () => {
    await createUser(
      "alice",
      "$argon2id$v=19$m=65536,t=3,p=1$somesalt$somehash",
    );
    const user = await findUser("alice");
    assertExists(user);
    assertEquals(user.username, "alice");
    assertEquals(
      user.passwordHash,
      "$argon2id$v=19$m=65536,t=3,p=1$somesalt$somehash",
    );
    assertEquals(typeof user.createdAt, "number");
  });
});

Deno.test("findUser returns null for unknown username", async () => {
  await withKv(async () => {
    const user = await findUser("nobody");
    assertEquals(user, null);
  });
});

Deno.test("createUser throws if username already exists", async () => {
  await withKv(async () => {
    await createUser("bob", "$argon2id$hash1");
    await assertRejects(
      () => createUser("bob", "$argon2id$hash2"),
      Error,
      "already exists",
    );
  });
});

Deno.test("createUser does not overwrite existing hash", async () => {
  await withKv(async () => {
    await createUser("carol", "$argon2id$original");
    try {
      await createUser("carol", "$argon2id$new");
    } catch {
      // expected
    }
    const user = await findUser("carol");
    assertEquals(user?.passwordHash, "$argon2id$original");
  });
});
