import { assertEquals, assertNotEquals } from "@std/assert";
import { presignGet, presignPut } from "@/lib/photos/signing.ts";
import type { R2Config } from "@/lib/photos/config.ts";

const cfg: R2Config = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  publicUrl: "https://testaccount.r2.cloudflarestorage.com/test-bucket",
};

Deno.test("presignPut URL contains the key", () => {
  const key = "abc123def456";
  const url = presignPut(cfg, key, "image/jpeg");
  assertEquals(url.includes(key), true);
});

Deno.test("presignPut URL contains X-Amz-Expires (default 300)", () => {
  const url = presignPut(cfg, "somekey", "image/jpeg");
  assertEquals(url.includes("X-Amz-Expires=300"), true);
});

Deno.test("presignPut URL contains non-empty signature", () => {
  const url = presignPut(cfg, "somekey", "image/jpeg");
  const match = url.match(/X-Amz-Signature=([0-9a-f]+)/i);
  assertEquals(match !== null, true);
  assertEquals((match![1]?.length ?? 0) > 0, true);
});

Deno.test("presignPut URL with custom ttl contains correct Expires", () => {
  const url = presignPut(cfg, "somekey", "image/jpeg", 120);
  assertEquals(url.includes("X-Amz-Expires=120"), true);
});

Deno.test("presignGet URL contains the key", () => {
  const key = "photokey9999";
  const now = Math.floor(Date.now() / 1000);
  const url = presignGet(cfg, key, now);
  assertEquals(url.includes(key), true);
});

Deno.test("presignGet URL contains non-empty signature", () => {
  const now = Math.floor(Date.now() / 1000);
  const url = presignGet(cfg, "mykey", now);
  const match = url.match(/X-Amz-Signature=([0-9a-f]+)/i);
  assertEquals(match !== null, true);
  assertEquals((match![1]?.length ?? 0) > 0, true);
});

Deno.test("presignGet two calls within same 15-min window produce identical URLs", () => {
  // Fix both calls to the same window epoch (floor to 900s boundary)
  const windowStart = Math.floor(Date.now() / 1000 / 900) * 900;
  // Both t1 and t2 are within the same window
  const t1 = windowStart + 10;
  const t2 = windowStart + 200;
  const url1 = presignGet(cfg, "stablekey", t1);
  const url2 = presignGet(cfg, "stablekey", t2);
  assertEquals(url1, url2);
});

Deno.test("presignGet calls in different windows produce different URLs", () => {
  const windowStart = Math.floor(Date.now() / 1000 / 900) * 900;
  const t1 = windowStart + 10; // window N
  const t2 = windowStart + 901; // window N+1
  const url1 = presignGet(cfg, "stablekey", t1);
  const url2 = presignGet(cfg, "stablekey", t2);
  assertNotEquals(url1, url2);
});
