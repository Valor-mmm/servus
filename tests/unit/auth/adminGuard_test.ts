import { assertEquals } from "@std/assert";
import { isAdminUser } from "@/lib/auth/adminGuard.ts";

Deno.test("isAdminUser: helper accounts are never admin", () => {
  assertEquals(isAdminUser("helper-abc123def456"), false);
  assertEquals(isAdminUser("helper-0000000000000000"), false);
});

Deno.test("isAdminUser: regular accounts are admin by default", () => {
  assertEquals(isAdminUser("monster"), true);
  assertEquals(isAdminUser("maus"), true);
  assertEquals(isAdminUser("alice"), true);
});

Deno.test("isAdminUser: SERVUS_ADMIN_USERS restricts access", () => {
  Deno.env.set("SERVUS_ADMIN_USERS", "monster");
  try {
    assertEquals(isAdminUser("monster"), true);
    assertEquals(isAdminUser("maus"), false);
    assertEquals(isAdminUser("alice"), false);
    assertEquals(isAdminUser("helper-abc"), false);
  } finally {
    Deno.env.delete("SERVUS_ADMIN_USERS");
  }
});

Deno.test("isAdminUser: SERVUS_ADMIN_USERS supports comma-separated list", () => {
  Deno.env.set("SERVUS_ADMIN_USERS", "monster, maus");
  try {
    assertEquals(isAdminUser("monster"), true);
    assertEquals(isAdminUser("maus"), true);
    assertEquals(isAdminUser("alice"), false);
  } finally {
    Deno.env.delete("SERVUS_ADMIN_USERS");
  }
});
