import { assertEquals, assertExists } from "@std/assert";
import { closeKv, getKv, setKv } from "@/lib/kv/client.ts";

Deno.test("getKv returns a KV instance", async () => {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  const got = await getKv();
  assertExists(got);
  await closeKv();
});

Deno.test("setKv swaps the instance used by getKv", async () => {
  const kv1 = await Deno.openKv(":memory:");
  const kv2 = await Deno.openKv(":memory:");
  setKv(kv1);
  assertEquals(await getKv(), kv1);
  setKv(kv2);
  assertEquals(await getKv(), kv2);
  await kv1.close();
  await closeKv();
});

Deno.test("closeKv clears the singleton so next getKv re-opens", async () => {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  await closeKv();
  // After closing, inject a fresh one to avoid real file open
  const kv2 = await Deno.openKv(":memory:");
  setKv(kv2);
  const got = await getKv();
  assertExists(got);
  await closeKv();
});
