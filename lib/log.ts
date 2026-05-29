const REDACTED_KEYS = new Set([
  "password",
  "passwordHash",
  "sessionId",
  "csrfToken",
  "cookie",
  "sessionKey",
]);

export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = REDACTED_KEYS.has(k) ? "[REDACTED]" : v;
  }
  return result;
}

export function log(
  level: "info" | "warn" | "error",
  msg: string,
  data?: Record<string, unknown>,
): void {
  const entry: Record<string, unknown> = { level, msg };
  if (data) Object.assign(entry, redact(data));
  console.log(JSON.stringify(entry));
}
