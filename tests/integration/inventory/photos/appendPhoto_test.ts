import { assertEquals, assertExists } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { handleAppendPhoto } from "@/lib/inventory/appendPhotoApi.ts";
import { createItem } from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("append-photo: appends key to existing item photos", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Camera",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
      photos: ["key1"],
      status: "complete",
    });

    const result = await handleAppendPhoto({
      itemId: item.id,
      photoKey: "key2",
    });

    assertEquals(result.status, 200);
    assertExists(result.item);
    assertEquals(result.item.photos, ["key1", "key2"]);
  });
});

Deno.test("append-photo: does NOT change status", async () => {
  await withKv(async () => {
    const confirmed = await createItem({
      name: "Confirmed item",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
      photos: ["k1"],
      status: "complete",
    });
    const resultC = await handleAppendPhoto({
      itemId: confirmed.id,
      photoKey: "k2",
    });
    assertEquals(resultC.item?.status, "complete");

    const pending = await createItem({
      name: "",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
      photos: ["p1"],
      status: "incomplete",
    });
    const resultP = await handleAppendPhoto({
      itemId: pending.id,
      photoKey: "p2",
    });
    assertEquals(resultP.item?.status, "incomplete");
  });
});

Deno.test("append-photo: returns 404 for unknown item", async () => {
  await withKv(async () => {
    const result = await handleAppendPhoto({
      itemId: "nonexistent",
      photoKey: "somekey",
    });
    assertEquals(result.status, 404);
  });
});

Deno.test("append-photo: missing photoKey returns 400", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "Test",
      categoryId: null,
      roomId: null,
      estimatedValue: null,
    });
    const result = await handleAppendPhoto({ itemId: item.id });
    assertEquals(result.status, 400);
  });
});
