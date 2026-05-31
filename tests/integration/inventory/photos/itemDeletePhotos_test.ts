import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { createItem, deleteItem, findItem } from "@/lib/inventory/itemRepo.ts";
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

Deno.test("delete item with photos issues R2 deletes for all keys", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Camera",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
      photos: ["key1", "key2"],
    });

    const deletedKeys: string[] = [];
    const stubFetch = (
      url: string | URL,
      _init?: RequestInit,
    ): Promise<Response> => {
      deletedKeys.push(String(url));
      return Promise.resolve(new Response(null, { status: 204 }));
    };

    await deleteItem(item.id, R2_CFG, stubFetch);

    // Wait for fire-and-forget deletes
    await new Promise((r) => setTimeout(r, 20));

    assertEquals(await findItem(item.id), null);
    assertEquals(deletedKeys.some((u) => u.includes("key1")), true);
    assertEquals(deletedKeys.some((u) => u.includes("key2")), true);
  });
});

Deno.test("R2 delete failure does not block item deletion", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Fragile",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
      photos: ["failing-key"],
    });

    const failFetch = (
      _url: string | URL,
      _init?: RequestInit,
    ): Promise<Response> => Promise.reject(new Error("Network error"));

    // Should not throw
    await deleteItem(item.id, R2_CFG, failFetch);

    // Item is still deleted in KV
    assertEquals(await findItem(item.id), null);
  });
});

Deno.test("delete item without photos issues no R2 deletes", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "No photos",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
      photos: [],
    });

    let deleteCount = 0;
    const stubFetch = (
      _url: string | URL,
      _init?: RequestInit,
    ): Promise<Response> => {
      deleteCount++;
      return Promise.resolve(new Response(null, { status: 204 }));
    };

    await deleteItem(item.id, R2_CFG, stubFetch);
    await new Promise((r) => setTimeout(r, 20));

    assertEquals(deleteCount, 0);
  });
});
