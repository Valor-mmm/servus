import { assertEquals } from "@std/assert";
import { migrateUserRoles } from "@/scripts/migrate-user-roles.ts";

Deno.test("migrateUserRoles: promotes role-less users to admin", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await kv.set(["user", "alice"], {
      username: "alice",
      passwordHash: "$argon2id$hash",
      createdAt: 1000,
    });
    await kv.set(["user", "bob"], {
      username: "bob",
      passwordHash: "$argon2id$hash",
      createdAt: 2000,
    });

    const { promoted, skipped } = await migrateUserRoles(kv);

    assertEquals(promoted, 2);
    assertEquals(skipped, 0);

    const alice = await kv.get<{ role: string }>(["user", "alice"]);
    assertEquals(alice.value?.role, "admin");

    const bob = await kv.get<{ role: string }>(["user", "bob"]);
    assertEquals(bob.value?.role, "admin");
  } finally {
    kv.close();
  }
});

Deno.test("migrateUserRoles: skips users that already have a role", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await kv.set(["user", "carol"], {
      username: "carol",
      passwordHash: "$argon2id$hash",
      createdAt: 1000,
      role: "admin",
    });
    await kv.set(["user", "helper1"], {
      username: "helper1",
      passwordHash: "$argon2id$hash",
      createdAt: 2000,
      role: "user",
    });

    const { promoted, skipped } = await migrateUserRoles(kv);

    assertEquals(promoted, 0);
    assertEquals(skipped, 2);
  } finally {
    kv.close();
  }
});

Deno.test("migrateUserRoles: idempotent — second run makes no changes", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await kv.set(["user", "dave"], {
      username: "dave",
      passwordHash: "$argon2id$hash",
      createdAt: 1000,
    });

    const first = await migrateUserRoles(kv);
    assertEquals(first.promoted, 1);
    assertEquals(first.skipped, 0);

    const second = await migrateUserRoles(kv);
    assertEquals(second.promoted, 0);
    assertEquals(second.skipped, 1);
  } finally {
    kv.close();
  }
});
