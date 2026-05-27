import { getKv } from "@/lib/kv/client.ts";
import type { User } from "@/lib/auth/types.ts";

const USER_KEY = (username: string): Deno.KvKey => ["user", username];

export async function createUser(
  username: string,
  passwordHash: string,
): Promise<User> {
  const kv = await getKv();
  const key = USER_KEY(username);

  const user: User = { username, passwordHash, createdAt: Date.now() };

  const result = await kv.atomic()
    .check({ key, versionstamp: null })
    .set(key, user)
    .commit();

  if (!result.ok) {
    throw new Error(`User '${username}' already exists`);
  }

  return user;
}

export async function findUser(username: string): Promise<User | null> {
  const kv = await getKv();
  const entry = await kv.get<User>(USER_KEY(username));
  return entry.value;
}
