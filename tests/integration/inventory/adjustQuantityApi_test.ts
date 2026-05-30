import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { createItem } from "@/lib/inventory/itemRepo.ts";
import { handleAdjustQuantityPost } from "@/lib/inventory/adjustQuantityApi.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const CAT = "cat-api";

Deno.test("adjustQuantityApi: valid increment returns updated quantity", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "GabelAPI",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 3,
    });

    const result = await handleAdjustQuantityPost({
      itemId: item.id,
      delta: 1,
    });
    assertEquals(result.status, 200);
    assertEquals(result.quantity, 4);
  });
});

Deno.test("adjustQuantityApi: valid decrement returns updated quantity", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "LöffelAPI",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 5,
    });

    const result = await handleAdjustQuantityPost({
      itemId: item.id,
      delta: -1,
    });
    assertEquals(result.status, 200);
    assertEquals(result.quantity, 4);
  });
});

Deno.test("adjustQuantityApi: decrement at floor returns quantity 1", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "GlasAPI",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 1,
    });

    const result = await handleAdjustQuantityPost({
      itemId: item.id,
      delta: -1,
    });
    assertEquals(result.status, 200);
    assertEquals(result.quantity, 1);
  });
});

Deno.test("adjustQuantityApi: invalid delta returns 400", async () => {
  await withKv(async () => {
    const item = await createItem({
      name: "TasseAPI",
      categoryId: CAT,
      roomId: null,
      estimatedValue: null,
      quantity: 2,
    });

    const result = await handleAdjustQuantityPost({
      itemId: item.id,
      delta: 5,
    });
    assertEquals(result.status, 400);
    assertEquals(result.error, "invalid");
  });
});

Deno.test("adjustQuantityApi: missing itemId returns 400", async () => {
  await withKv(async () => {
    const result = await handleAdjustQuantityPost({ delta: 1 });
    assertEquals(result.status, 400);
    assertEquals(result.error, "invalid");
  });
});

Deno.test("adjustQuantityApi: non-object body returns 400", async () => {
  await withKv(async () => {
    const result = await handleAdjustQuantityPost("not-an-object");
    assertEquals(result.status, 400);
    assertEquals(result.error, "invalid");
  });
});
