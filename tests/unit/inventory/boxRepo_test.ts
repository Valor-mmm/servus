import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { closeKv, getKv, setKv } from "@/lib/kv/client.ts";
import {
  createBox,
  deleteBox,
  findBox,
  findBoxByCode,
  listBoxes,
  updateBox,
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

Deno.test("createBox returns box with sequential code B-001", async () => {
  await withKv(async () => {
    const box = await createBox({});
    assertExists(box.id);
    assertEquals(box.code, "B-001");
    assertEquals(box.status, "empty");
    assertEquals(box.label, null);
    assertEquals(box.destinationRoomId, null);
    assertEquals(typeof box.createdAt, "number");
  });
});

Deno.test("createBox with label and destinationRoomId", async () => {
  await withKv(async () => {
    const box = await createBox({
      label: "Küche",
      destinationRoomId: "room-1",
    });
    assertEquals(box.label, "Küche");
    assertEquals(box.destinationRoomId, "room-1");
  });
});

Deno.test("createBox assigns sequential codes", async () => {
  await withKv(async () => {
    const b1 = await createBox({});
    const b2 = await createBox({});
    const b3 = await createBox({});
    assertEquals(b1.code, "B-001");
    assertEquals(b2.code, "B-002");
    assertEquals(b3.code, "B-003");
  });
});

Deno.test("findBox returns null for unknown id", async () => {
  await withKv(async () => {
    assertEquals(await findBox("nonexistent"), null);
  });
});

Deno.test("findBox returns created box", async () => {
  await withKv(async () => {
    const box = await createBox({ label: "Bücher" });
    const found = await findBox(box.id);
    assertExists(found);
    assertEquals(found.code, "B-001");
    assertEquals(found.label, "Bücher");
  });
});

Deno.test("findBoxByCode returns null for unknown code", async () => {
  await withKv(async () => {
    assertEquals(await findBoxByCode("B-999"), null);
  });
});

Deno.test("findBoxByCode returns box by code", async () => {
  await withKv(async () => {
    const box = await createBox({});
    const found = await findBoxByCode("B-001");
    assertExists(found);
    assertEquals(found.id, box.id);
  });
});

Deno.test("listBoxes returns all boxes with item counts", async () => {
  await withKv(async () => {
    const b1 = await createBox({ label: "Alpha" });
    const b2 = await createBox({ label: "Beta" });
    // simulate items assigned to b1
    const kv = await getKv();
    await kv.set(["item-by-box", b1.id, "item-1"], true);
    await kv.set(["item-by-box", b1.id, "item-2"], true);

    const list = await listBoxes();
    assertEquals(list.length, 2);
    const a = list.find((box) => box.id === b1.id)!;
    const beta = list.find((box) => box.id === b2.id)!;
    assertEquals(a.itemCount, 2);
    assertEquals(beta.itemCount, 0);
  });
});

Deno.test("updateBox changes label and destinationRoomId", async () => {
  await withKv(async () => {
    const box = await createBox({});
    const updated = await updateBox(box.id, {
      label: "Wohnzimmer",
      destinationRoomId: "room-2",
    });
    assertEquals(updated.label, "Wohnzimmer");
    assertEquals(updated.destinationRoomId, "room-2");
    assertEquals(updated.code, box.code);
  });
});

Deno.test("updateBox can clear label and destinationRoomId", async () => {
  await withKv(async () => {
    const box = await createBox({ label: "Test", destinationRoomId: "r1" });
    const updated = await updateBox(box.id, {
      label: null,
      destinationRoomId: null,
    });
    assertEquals(updated.label, null);
    assertEquals(updated.destinationRoomId, null);
  });
});

Deno.test("deleteBox removes an empty box", async () => {
  await withKv(async () => {
    const box = await createBox({});
    await deleteBox(box.id);
    assertEquals(await findBox(box.id), null);
    assertEquals(await findBoxByCode(box.code), null);
  });
});

Deno.test("deleteBox rejects when items are assigned", async () => {
  await withKv(async () => {
    const box = await createBox({});
    const kv = await getKv();
    await kv.set(["item-by-box", box.id, "item-1"], true);
    await assertRejects(
      () => deleteBox(box.id),
      Error,
      "not empty",
    );
  });
});

Deno.test("updateBox throws for unknown id", async () => {
  await withKv(async () => {
    await assertRejects(
      () => updateBox("nonexistent", { label: "x" }),
      Error,
      "not found",
    );
  });
});
