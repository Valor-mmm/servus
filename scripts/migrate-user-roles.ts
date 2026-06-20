#!/usr/bin/env -S deno run --allow-env --allow-read --unstable-kv
/**
 * One-shot migration: promote all existing role-less users to role: "admin".
 * Safe to re-run — users that already have a role are skipped.
 */
import { getKv } from "@/lib/kv/client.ts";
import type { User } from "@/lib/auth/types.ts";

export interface MigrateResult {
  promoted: number;
  skipped: number;
}

export async function migrateUserRoles(kv: Deno.Kv): Promise<MigrateResult> {
  let promoted = 0;
  let skipped = 0;

  for await (
    const entry of kv.list<User>({ prefix: ["user"] })
  ) {
    if (entry.key[0] !== "user" || entry.key.length !== 2) continue;
    const user = entry.value;
    if (!user || typeof user !== "object") continue;
    if ("role" in user && user.role) {
      skipped++;
      continue;
    }
    await kv.set(entry.key, { ...user, role: "admin" });
    promoted++;
  }

  return { promoted, skipped };
}

// Only run as script, not when imported by tests
if (import.meta.main) {
  const kv = await getKv();
  const { promoted, skipped } = await migrateUserRoles(kv);
  kv.close();
  console.log(
    `[migrate-user-roles] promoted ${promoted} user(s), skipped ${skipped} existing`,
  );
}
