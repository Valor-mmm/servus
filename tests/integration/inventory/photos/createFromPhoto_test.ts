import { assertEquals, assertExists } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { handleCreateFromPhoto } from "@/lib/inventory/createFromPhotoApi.ts";
import { findItem, listItems } from "@/lib/inventory/itemRepo.ts";
import { createBox, findBox } from "@/lib/inventory/boxRepo.ts";
import { applyCsrfGuard, applyRequireAuth } from "@/lib/auth/middleware.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

// ── Business logic tests ─────────────────────────────────────────────────────

Deno.test("create-from-photo: creates pending item with photos:[key]", async () => {
  await withKv(async () => {
    const key = "abc123def456";
    const result = await handleCreateFromPhoto({ photoKey: key });

    assertEquals(result.status, 201);
    assertExists(result.item);
    assertEquals(result.item.status, "pending");
    assertEquals(result.item.name, "");
    assertEquals(result.item.photos, [key]);
    assertEquals(result.item.categoryId, null);
    assertEquals(result.item.quantity, 1);
  });
});

Deno.test("create-from-photo: item appears in findItem and listItems", async () => {
  await withKv(async () => {
    const key = "photokey-list-test";
    const result = await handleCreateFromPhoto({ photoKey: key });
    assertExists(result.item);

    const found = await findItem(result.item.id);
    assertExists(found);
    assertEquals(found.photos, [key]);
    assertEquals(found.status, "pending");

    const all = await listItems();
    const inList = all.find((i) => i.id === result.item!.id);
    assertExists(inList);
  });
});

Deno.test("create-from-photo: with boxId assigns item and packs empty box", async () => {
  await withKv(async () => {
    const box = await createBox({});
    assertEquals((await findBox(box.id))?.status, "empty");

    const key = "box-photo-key";
    const result = await handleCreateFromPhoto({
      photoKey: key,
      boxId: box.id,
    });

    assertEquals(result.status, 201);
    assertExists(result.item);
    assertEquals(result.item.boxId, box.id);
    assertEquals(result.item.status, "pending");

    const updatedBox = await findBox(box.id);
    assertEquals(updatedBox?.status, "packed");
  });
});

Deno.test("create-from-photo: missing photoKey returns 400", async () => {
  await withKv(async () => {
    const result = await handleCreateFromPhoto({ boxId: null });
    assertEquals(result.status, 400);
  });
});

Deno.test("create-from-photo: invalid body returns 400", async () => {
  await withKv(async () => {
    const result = await handleCreateFromPhoto("not-an-object");
    assertEquals(result.status, 400);
  });
});

// ── Auth/CSRF guard tests (middleware behavior) ───────────────────────────────

const SESSION_KEY = "a".repeat(64);

Deno.test("create-from-photo route: unauthenticated POST returns 401", async () => {
  const req = new Request("http://localhost:8000/api/items/create-from-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoKey: "k" }),
  });
  await withKv(async () => {
    const result = await applyRequireAuth(req, SESSION_KEY);
    assertEquals(result.pass, false);
    assertEquals(result.response?.status, 401);
  });
});

Deno.test("create-from-photo route: missing CSRF token returns 403", async () => {
  const sessionCsrfToken = "validtoken12345678901234567890ab";
  const req = new Request("http://localhost:8000/api/items/create-from-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // No x-csrf-token header
    body: JSON.stringify({ photoKey: "k" }),
  });
  const result = await applyCsrfGuard(req, sessionCsrfToken);
  assertEquals(result.pass, false);
  assertEquals(result.response?.status, 403);
});
