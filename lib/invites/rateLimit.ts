import { getKv } from "@/lib/kv/client.ts";
import type { IpRateLimit } from "@/lib/auth/types.ts";
import type { RateLimitResult } from "@/lib/auth/rateLimitRepo.ts";

const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_THRESHOLD = 10;

async function hashIp(ip: string, sessionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(sessionKey + ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(
    new Uint8Array(digest),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

export async function checkAndIncrementInviteIp(
  ip: string,
  sessionKey: string,
): Promise<RateLimitResult> {
  const kv = await getKv();
  const hashedIp = await hashIp(ip, sessionKey);
  // Uses "rate-invite" namespace to stay separate from login rate limits
  const key: Deno.KvKey = ["rate-invite", "ip", hashedIp];

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
