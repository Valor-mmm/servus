/**
 * Integration test: multi-item continuous capture session.
 *
 * Simulates: 3 shutter taps → ✓ → 2 shutter taps → ✕
 * Expected result: 2 items, first with 3 photos, second with 2 photos.
 */
import { assertEquals } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { handleCreateFromPhoto } from "@/lib/inventory/createFromPhotoApi.ts";
import { handleAppendPhoto } from "@/lib/inventory/appendPhotoApi.ts";
import { findItem } from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test(
  "continuous capture session: 3 taps + confirm + 2 taps = 2 items (3 and 2 photos)",
  async () => {
    await withKv(async () => {
      const BOX_ID = "box-session-test";

      // ── Item 1: 3 shutter taps ──────────────────────────────────────────
      const create1 = await handleCreateFromPhoto({
        photoKey: "key-1a",
        boxId: BOX_ID,
      });
      assertEquals(create1.status, 201);
      const item1Id = create1.item!.id;

      await handleAppendPhoto({ itemId: item1Id, photoKey: "key-1b" });
      await handleAppendPhoto({ itemId: item1Id, photoKey: "key-1c" });

      // ── ✓ confirm — item1 is finalized, session returns to "starting" ──
      const item1 = await findItem(item1Id);
      assertEquals(item1?.photos.length, 3);
      assertEquals(item1?.boxId, BOX_ID);

      // ── Item 2: 2 shutter taps ──────────────────────────────────────────
      const create2 = await handleCreateFromPhoto({
        photoKey: "key-2a",
        boxId: BOX_ID,
      });
      assertEquals(create2.status, 201);
      const item2Id = create2.item!.id;

      await handleAppendPhoto({ itemId: item2Id, photoKey: "key-2b" });

      // ── ✕ close ────────────────────────────────────────────────────────
      const item2 = await findItem(item2Id);
      assertEquals(item2?.photos.length, 2);
      assertEquals(item2?.boxId, BOX_ID);

      // ── Final assertions ───────────────────────────────────────────────
      // Two distinct items were created in the same box
      assertEquals(item1Id !== item2Id, true);
    });
  },
);
