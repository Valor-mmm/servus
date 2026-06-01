import { assertEquals, assertExists } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { handleRemovePhoto } from "@/lib/inventory/removePhotoApi.ts";
import { createItem, findItem } from "@/lib/inventory/itemRepo.ts";
import type { R2Config } from "@/lib/photos/config.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const R2_CFG: R2Config = {
  accessKeyId: "AKID",
  secretAccessKey: "secret",
  publicUrl: "https://test.r2.cloudflarestorage.com/test-bucket",
};

Deno.test("remove-photo: removes specified key from photos array", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Thing",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
      photos: ["k1", "k2", "k3"],
    });

    let deletedKey: string = "";
    const stubFetch = (
      url: string | URL,
      _init?: RequestInit,
    ): Promise<Response> => {
      deletedKey = String(url);
      return Promise.resolve(new Response(null, { status: 204 }));
    };

    const result = await handleRemovePhoto(
      { itemId: item.id, photoKey: "k2" },
      R2_CFG,
      stubFetch,
    );

    assertEquals(result.status, 200);
    assertExists(result.item);
    assertEquals(result.item.photos, ["k1", "k3"]);

    // Wait for the fire-and-forget delete to complete
    await new Promise((r) => setTimeout(r, 10));
    assertEquals(deletedKey.includes("k2"), true);
  });
});

Deno.test("remove-photo: status unchanged even if photos becomes empty", async () => {
  await withKv(async () => {
    const pending = await createItem({
      name: "",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
      photos: ["only-key"],
      status: "pending",
    });

    const result = await handleRemovePhoto(
      { itemId: pending.id, photoKey: "only-key" },
      null, // no R2 config — skip delete
    );

    assertEquals(result.status, 200);
    assertEquals(result.item?.photos, []);
    assertEquals(result.item?.status, "pending");
  });
});

Deno.test("remove-photo: R2 delete failure does not fail the request", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Fragile",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
      photos: ["bad-key"],
    });

    const failFetch = (
      _url: string | URL,
      _init?: RequestInit,
    ): Promise<Response> => Promise.reject(new Error("Network error"));

    const result = await handleRemovePhoto(
      { itemId: item.id, photoKey: "bad-key" },
      R2_CFG,
      failFetch,
    );

    // Response is still success
    assertEquals(result.status, 200);
    // KV record is updated
    const updated = await findItem(item.id);
    assertEquals(updated?.photos, []);
  });
});

Deno.test("remove-photo: returns 404 for unknown item", async () => {
  await withKv(async () => {
    const result = await handleRemovePhoto(
      { itemId: "nope", photoKey: "k" },
      null,
    );
    assertEquals(result.status, 404);
  });
});
