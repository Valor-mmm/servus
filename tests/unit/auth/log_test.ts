import { assertEquals } from "@std/assert";
import { redact } from "@/lib/log.ts";

Deno.test("redact: removes password field", () => {
  const result = redact({ username: "alice", password: "secret" });
  assertEquals(result.password, "[REDACTED]");
  assertEquals(result.username, "alice");
});

Deno.test("redact: removes passwordHash field", () => {
  const result = redact({ passwordHash: "$argon2id$..." });
  assertEquals(result.passwordHash, "[REDACTED]");
});

Deno.test("redact: removes sessionId field", () => {
  const result = redact({ sessionId: "deadbeef" });
  assertEquals(result.sessionId, "[REDACTED]");
});

Deno.test("redact: removes csrfToken field", () => {
  const result = redact({ csrfToken: "abc123" });
  assertEquals(result.csrfToken, "[REDACTED]");
});

Deno.test("redact: removes cookie field", () => {
  const result = redact({ cookie: "servus_session=..." });
  assertEquals(result.cookie, "[REDACTED]");
});

Deno.test("redact: removes sessionKey field", () => {
  const result = redact({ sessionKey: "0".repeat(64) });
  assertEquals(result.sessionKey, "[REDACTED]");
});

Deno.test("redact: leaves non-sensitive fields unchanged", () => {
  const result = redact({ username: "alice", action: "login" });
  assertEquals(result.username, "alice");
  assertEquals(result.action, "login");
});

Deno.test("redact: handles nested objects by shallow-redacting top-level keys", () => {
  const result = redact({ user: { password: "secret" }, password: "top" });
  assertEquals(result.password, "[REDACTED]");
  // Nested objects are not traversed (shallow only)
  assertEquals((result.user as Record<string, unknown>).password, "secret");
});
