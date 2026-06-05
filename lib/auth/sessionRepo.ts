import { getKv } from "@/lib/kv/client.ts";
import type { Session } from "@/lib/auth/types.ts";

const SESSION_KEY = (id: string): Deno.KvKey => ["session", id];
const SESSION_BY_USER_KEY = (
  username: string,
  id: string,
): Deno.KvKey => ["session-by-user", username, id];

// Absolute timeout: 60 days in ms
const ABSOLUTE_TTL_MS = 60 * 24 * 60 * 60 * 1000;
// Absolute timeout in seconds for use in Set-Cookie Max-Age.
export const ABSOLUTE_TTL_SECONDS = ABSOLUTE_TTL_MS / 1000;
// Idle timeout: 14 days in ms
export const IDLE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
// lastSeen update throttle: 1 hour in ms
const TOUCH_THROTTLE_MS = 60 * 60 * 1000;

function randomId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(
  username: string,
  csrfToken: string,
): Promise<Session> {
  const kv = await getKv();
  const sessionId = randomId();
  const now = Date.now();

  const session: Session = {
    sessionId,
    username,
    createdAt: now,
    lastSeen: now,
    csrfToken,
  };

  await kv.atomic()
    .set(SESSION_KEY(sessionId), session, { expireIn: ABSOLUTE_TTL_MS })
    .set(SESSION_BY_USER_KEY(username, sessionId), null, {
      expireIn: ABSOLUTE_TTL_MS,
    })
    .commit();

  return session;
}

export async function findSession(sessionId: string): Promise<Session | null> {
  const kv = await getKv();
  const entry = await kv.get<Session>(SESSION_KEY(sessionId), {
    consistency: "strong",
  });
  return entry.value;
}

export async function deleteSession(
  sessionId: string,
  username: string,
): Promise<void> {
  const kv = await getKv();
  await kv.atomic()
    .delete(SESSION_KEY(sessionId))
    .delete(SESSION_BY_USER_KEY(username, sessionId))
    .commit();
}

export async function listSessionsForUser(username: string): Promise<string[]> {
  const kv = await getKv();
  const ids: string[] = [];
  for await (
    const entry of kv.list({ prefix: ["session-by-user", username] })
  ) {
    const key = entry.key;
    ids.push(key[key.length - 1] as string);
  }
  return ids;
}

/** Update lastSeen, but at most once per hour to limit write amplification. */
export async function touchSession(sessionId: string): Promise<void> {
  const kv = await getKv();
  const entry = await kv.get<Session>(SESSION_KEY(sessionId));
  if (!entry.value) return;

  const now = Date.now();
  if (now - entry.value.lastSeen < TOUCH_THROTTLE_MS) return;

  const updated: Session = { ...entry.value, lastSeen: now };
  const remaining = ABSOLUTE_TTL_MS -
    (now - entry.value.createdAt);
  if (remaining <= 0) return;

  await kv.set(SESSION_KEY(sessionId), updated, { expireIn: remaining });
}
