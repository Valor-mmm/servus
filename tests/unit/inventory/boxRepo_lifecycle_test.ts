import { assertEquals, assertExists } from "@std/assert";
import { closeKv, getKv, setKv } from "@/lib/kv/client.ts";
import {
  createBox,
  findBox,
  findBoxByCode,
  tombstoneDeleteBox,
  updateBoxStatus,
} from "@/lib/inventory/boxRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

// ── updateBoxStatus ───────────────────────────────────────────────────────────

Deno.test("updateBoxStatus sets packed when items exist", async () => {
  await withKv(async () => {
    const box = await createBox({});
    assertEquals(box.status, "empty");

    const kv = await getKv();
    await kv.set(["item-by-box", box.id, "item-1"], true);

    await updateBoxStatus(box.id);

    const updated = await findBox(box.id);
    assertEquals(updated?.status, "packed");
  });
});

Deno.test("updateBoxStatus sets empty when no items", async () => {
  await withKv(async () => {
    const box = await createBox({});
    const kv = await getKv();
    await kv.set(["item-by-box", box.id, "item-1"], true);
    await updateBoxStatus(box.id);
    assertEquals((await findBox(box.id))?.status, "packed");

    await kv.delete(["item-by-box", box.id, "item-1"]);
    await updateBoxStatus(box.id);
    assertEquals((await findBox(box.id))?.status, "empty");
  });
});

Deno.test("updateBoxStatus does not downgrade delivered status", async () => {
  await withKv(async () => {
    const box = await createBox({});
    // Force status to delivered directly in KV
    const kv = await getKv();
    await kv.set(["box", box.id], { ...box, status: "delivered" });

    // Call with no items — should not revert to empty
    await updateBoxStatus(box.id);
    assertEquals((await findBox(box.id))?.status, "delivered");
  });
});

Deno.test("updateBoxStatus is a no-op for unknown boxId", async () => {
  await withKv(async () => {
    // Must not throw
    await updateBoxStatus("nonexistent-box-id");
  });
});

// ── tombstoneDeleteBox ────────────────────────────────────────────────────────

Deno.test("tombstoneDeleteBox writes tombstone and removes live box", async () => {
  await withKv(async () => {
    const box = await createBox({ label: "Test", destinationRoomId: "room-1" });
    await tombstoneDeleteBox(box, "manual");

    assertEquals(await findBox(box.id), null);
    assertEquals(await findBoxByCode(box.code), null);

    const kv = await getKv();
    const tombstone = await kv.get(["box-tombstone", box.id]);
    assertExists(tombstone.value);
    const t = tombstone.value as {
      id: string;
      code: string;
      reason: string;
      label: string | null;
      deletedAt: number;
    };
    assertEquals(t.id, box.id);
    assertEquals(t.code, box.code);
    assertEquals(t.reason, "manual");
    assertEquals(t.label, "Test");
  });
});

Deno.test("tombstoneDeleteBox with reason unpacked", async () => {
  await withKv(async () => {
    const box = await createBox({});
    await tombstoneDeleteBox(box, "unpacked");

    const kv = await getKv();
    const tombstone = await kv.get(["box-tombstone", box.id]);
    assertExists(tombstone.value);
    assertEquals((tombstone.value as { reason: string }).reason, "unpacked");
  });
});

Deno.test("tombstoneDeleteBox does not decrement code counter", async () => {
  await withKv(async () => {
    const box1 = await createBox({});
    assertEquals(box1.code, "B-001");

    await tombstoneDeleteBox(box1, "manual");

    // Next box should be B-002, not B-001
    const box2 = await createBox({});
    assertEquals(box2.code, "B-002");
  });
});
