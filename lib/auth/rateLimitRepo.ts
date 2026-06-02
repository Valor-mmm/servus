import { getKv } from "@/lib/kv/client.ts";
import type { IpRateLimit, UserRateLimit } from "@/lib/auth/types.ts";

const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const IP_THRESHOLD = 30; // 30 per 15 min; E2E suite uses ~10-15 slots (setup + auth tests)
const USER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const USER_THRESHOLD = 5;

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds?: number;
}

async function hashIp(ip: string, sessionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(sessionKey + ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(
    new Uint8Array(digest),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

export async function checkAndIncrementIp(
  ip: string,
  sessionKey: string,
): Promise<RateLimitResult> {
  const kv = await getKv();
  const hashedIp = await hashIp(ip, sessionKey);
  const key: Deno.KvKey = ["rate", "ip", hashedIp];

  const entry = await kv.get<IpRateLimit>(key);
  const now = Date.now();

  let record: IpRateLimit;
  if (!entry.value || now - entry.value.windowStart >= IP_WINDOW_MS) {
    record = { count: 1, windowStart: now };
  } else {
    record = { ...entry.value, count: entry.value.count + 1 };
  }

  const windowEnd = record.windowStart + IP_WINDOW_MS;
  await kv.set(key, record, { expireIn: windowEnd - now });

  if (record.count > IP_THRESHOLD) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((windowEnd - now) / 1000),
    };
  }
  return { limited: false };
}

export async function checkAndIncrementUser(
  username: string,
): Promise<RateLimitResult> {
  const kv = await getKv();
  const key: Deno.KvKey = ["rate", "user", username];

  const entry = await kv.get<UserRateLimit>(key);
  const now = Date.now();

  let record: UserRateLimit;
  if (!entry.value || now - entry.value.firstFailAt >= USER_WINDOW_MS) {
    record = { count: 1, firstFailAt: now };
  } else {
    record = { ...entry.value, count: entry.value.count + 1 };
  }

  const windowEnd = record.firstFailAt + USER_WINDOW_MS;
  await kv.set(key, record, { expireIn: windowEnd - now });

  if (record.count > USER_THRESHOLD) {
    // Exponential backoff: 2^(count - threshold) * 30 seconds, capped at 1 hour
    const backoffSeconds = Math.min(
      Math.pow(2, record.count - USER_THRESHOLD) * 30,
      3600,
    );
    return { limited: true, retryAfterSeconds: backoffSeconds };
  }
  return { limited: false };
}

export async function resetUserFailures(username: string): Promise<void> {
  const kv = await getKv();
  await kv.delete(["rate", "user", username]);
}
