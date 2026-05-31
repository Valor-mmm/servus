/**
 * Live R2 integration test — skipped when R2_PUBLIC_URL is not set or points
 * to the fake e2e host. Run manually with real credentials to verify bucket
 * connectivity.
 *
 * Usage:
 *   deno test --allow-env --allow-read --allow-net \
 *     --env-file=.env tests/integration/r2_live_test.ts
 */
import { assertEquals } from "jsr:@std/assert";
import { presignGet, presignPut } from "@/lib/photos/signing.ts";
import type { R2Config } from "@/lib/photos/config.ts";

const PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL") ?? "";
const SKIP =
  !PUBLIC_URL ||
  PUBLIC_URL.includes("example.com") ||
  !Deno.env.get("R2_ACCESS_KEY_ID") ||
  !Deno.env.get("R2_SECRET_ACCESS_KEY");

const cfg: R2Config = {
  accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
  secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
  publicUrl: PUBLIC_URL,
};

Deno.test({
  name: "presignPut — PUT a small object to real R2 bucket",
  ignore: SKIP,
  async fn() {
    const key = `live-test/${crypto.randomUUID()}.txt`;
    const body = new TextEncoder().encode("hello from live r2 test");
    const contentType = "text/plain";

    const putUrl = presignPut(cfg, key, contentType, 60);

    const res = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });

    // Cloudflare R2 returns 200 on successful PUT
    assertEquals(
      res.status,
      200,
      `PUT failed: ${res.status} ${await res.text()}`,
    );
  },
});

Deno.test({
  name: "presignGet — GET a previously uploaded object from real R2 bucket",
  ignore: SKIP,
  async fn() {
    // First upload something we can read back
    const key = `live-test/${crypto.randomUUID()}.txt`;
    const content = "live-get-test-content";
    const body = new TextEncoder().encode(content);
    const contentType = "text/plain";

    const putUrl = presignPut(cfg, key, contentType, 60);
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });
    await putRes.body?.cancel();
    assertEquals(putRes.status, 200, `PUT failed: ${putRes.status}`);

    // Now GET it back
    const getUrl = presignGet(cfg, key);
    const getRes = await fetch(getUrl);
    const text = await getRes.text();
    assertEquals(getRes.status, 200, `GET failed: ${getRes.status} ${text}`);
    assertEquals(text, content);
  },
});

Deno.test({
  name: "unauthenticated GET is rejected by R2",
  ignore: SKIP,
  async fn() {
    const key = `live-test/${crypto.randomUUID()}.txt`;
    const rawUrl = `${PUBLIC_URL}/${key}`;
    const res = await fetch(rawUrl);
    // R2 returns 400/401/403 for unsigned requests to private buckets
    const status = res.status;
    await res.body?.cancel();
    assertEquals(
      status >= 400 && status < 500,
      true,
      `Expected 4xx for unauthenticated GET, got ${status}`,
    );
  },
});
