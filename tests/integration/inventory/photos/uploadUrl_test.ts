import { assertEquals, assertExists, assertMatch } from "@std/assert";
import { handleUploadUrl } from "@/lib/photos/uploadUrlApi.ts";
import { applyCsrfGuard, applyRequireAuth } from "@/lib/auth/middleware.ts";
import type { R2Config } from "@/lib/photos/config.ts";

const R2_CFG: R2Config = {
  accountId: "testaccount",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  bucket: "test-bucket",
  publicUrlBase: "https://testaccount.r2.cloudflarestorage.com/test-bucket",
};

Deno.test("upload-url: returns key and url for valid jpeg request", () => {
  const result = handleUploadUrl(
    { contentType: "image/jpeg", bytes: 500_000 },
    R2_CFG,
  );

  assertEquals(result.status, 200);
  assertExists(result.key);
  assertExists(result.url);
  // Key is a 64-char hex string (256 bits)
  assertMatch(result.key!, /^[0-9a-f]{64}$/);
  // URL contains the key
  assertEquals(result.url!.includes(result.key!), true);
  // URL contains a 5-minute expiry
  assertEquals(result.url!.includes("X-Amz-Expires=300"), true);
});

Deno.test("upload-url: key meets entropy contract (32 chars min)", () => {
  const result = handleUploadUrl(
    { contentType: "image/png", bytes: 100_000 },
    R2_CFG,
  );
  assertEquals(result.status, 200);
  assertEquals((result.key?.length ?? 0) >= 32, true);
});

Deno.test("upload-url: contentType application/pdf returns 400", () => {
  const result = handleUploadUrl(
    { contentType: "application/pdf", bytes: 1000 },
    R2_CFG,
  );
  assertEquals(result.status, 400);
});

Deno.test("upload-url: bytes > 4 MiB returns 400", () => {
  const result = handleUploadUrl(
    { contentType: "image/jpeg", bytes: 4 * 1024 * 1024 + 1 },
    R2_CFG,
  );
  assertEquals(result.status, 400);
});

Deno.test("upload-url: exactly 4 MiB is accepted", () => {
  const result = handleUploadUrl(
    { contentType: "image/jpeg", bytes: 4 * 1024 * 1024 },
    R2_CFG,
  );
  assertEquals(result.status, 200);
});

Deno.test("upload-url: image/webp is accepted", () => {
  const result = handleUploadUrl(
    { contentType: "image/webp", bytes: 200_000 },
    R2_CFG,
  );
  assertEquals(result.status, 200);
});

Deno.test("upload-url: image/png is accepted", () => {
  const result = handleUploadUrl(
    { contentType: "image/png", bytes: 300_000 },
    R2_CFG,
  );
  assertEquals(result.status, 200);
});

// ── Auth/CSRF tests ──────────────────────────────────────────────────────────

const SESSION_KEY = "a".repeat(64);

Deno.test("upload-url route: unauthenticated POST returns 401", async () => {
  const req = new Request("http://localhost:8000/api/photos/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: "image/jpeg", bytes: 1000 }),
  });
  const result = await applyRequireAuth(req, SESSION_KEY);
  assertEquals(result.pass, false);
  assertEquals(result.response?.status, 401);
});

Deno.test("upload-url route: missing CSRF token returns 403", async () => {
  const req = new Request("http://localhost:8000/api/photos/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: "image/jpeg", bytes: 1000 }),
  });
  const result = await applyCsrfGuard(req, "valid-token-12345678");
  assertEquals(result.pass, false);
  assertEquals(result.response?.status, 403);
});
