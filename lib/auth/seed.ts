import { hashPassword } from "@/lib/auth/password.ts";
import { createUser, findUser } from "@/lib/auth/userRepo.ts";

export interface SeedEntry {
  username: string;
  password: string;
}

export interface SeedResult {
  seeded: number;
  skipped: number;
}

export async function seedUsers(entries: SeedEntry[]): Promise<SeedResult> {
  let seeded = 0;
  let skipped = 0;

  for (const { username, password } of entries) {
    const existing = await findUser(username);
    if (existing) {
      skipped++;
      continue;
    }
    const passwordHash = await hashPassword(password);
    await createUser(username, passwordHash);
    seeded++;
  }

  return { seeded, skipped };
}

export async function seedFromEnv(): Promise<void> {
  const raw = Deno.env.get("SERVUS_SEED_USERS");
  if (!raw) {
    console.log("[seed] seeded 0 user(s), skipped 0 existing");
    return;
  }

  let entries: SeedEntry[];
  try {
    entries = JSON.parse(raw);
  } catch {
    console.error("[seed] SERVUS_SEED_USERS is not valid JSON — skipping seed");
    return;
  }

  const { seeded, skipped } = await seedUsers(entries);
  console.log(`[seed] seeded ${seeded} user(s), skipped ${skipped} existing`);
}
