import { assertEquals, assertRejects } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { createCategory } from "@/lib/inventory/categoryRepo.ts";
import {
  createItem,
  deleteItem,
  findItem,
  listItemsByContainer,
  listItemsByRoom,
  resolveRoom,
  updateItem,
} from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const ROOM_A = "room-a";
const ROOM_B = "room-b";

// Task 3.1 / 3.2 — item-by-container index and listItemsByContainer

Deno.test("setting containerId writes item-by-container index", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const container = await createItem({
      name: "Kiste",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const tool = await createItem({
      name: "Hammer",
      categoryId: null,
      containerId: container.id,
      roomId: null,
      estimatedValue: null,
    });
    const contents = await listItemsByContainer(container.id);
    assertEquals(contents.length, 1);
    assertEquals(contents[0].id, tool.id);
  });
});

Deno.test("updateItem with containerId writes container index", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const container = await createItem({
      name: "Kiste",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const tool = await createItem({
      name: "Schrauber",
      categoryId: null,
      roomId: ROOM_B,
      estimatedValue: null,
    });
    await updateItem(tool.id, { containerId: container.id });
    const contents = await listItemsByContainer(container.id);
    assertEquals(contents.length, 1);
    assertEquals(contents[0].id, tool.id);
  });
});

Deno.test("clearing containerId removes item from container index", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const container = await createItem({
      name: "Kiste",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const tool = await createItem({
      name: "Zange",
      categoryId: null,
      containerId: container.id,
      roomId: null,
      estimatedValue: null,
    });
    await updateItem(tool.id, { containerId: null });
    const contents = await listItemsByContainer(container.id);
    assertEquals(contents.length, 0);
  });
});

// Task 3.3 — canContain validation at boundary

Deno.test("assigning non-container-capable item as container is rejected", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kleidung", "generic", false);
    const notContainer = await createItem({
      name: "Hemd",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const tool = await createItem({
      name: "Hammer",
      categoryId: null,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    await assertRejects(
      () => updateItem(tool.id, { containerId: notContainer.id }),
      Error,
      "cannot contain",
    );
  });
});

Deno.test("creating item with non-container-capable container is rejected", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kleidung", "generic", false);
    const notContainer = await createItem({
      name: "Hemd",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    await assertRejects(
      () =>
        createItem({
          name: "Hammer",
          categoryId: null,
          containerId: notContainer.id,
          roomId: null,
          estimatedValue: null,
        }),
      Error,
      "cannot contain",
    );
  });
});

// Task 3.4 — cycle guard

Deno.test("self-containment is rejected", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const box = await createItem({
      name: "Box",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    await assertRejects(
      () => updateItem(box.id, { containerId: box.id }),
      Error,
      "itself",
    );
  });
});

Deno.test("descendant-as-container cycle is rejected", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const a = await createItem({
      name: "A",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const b = await createItem({
      name: "B",
      categoryId: cat.id,
      containerId: a.id,
      roomId: null,
      estimatedValue: null,
    });
    // Placing A inside B would create A→B→A cycle
    await assertRejects(
      () => updateItem(a.id, { containerId: b.id }),
      Error,
      "cycle",
    );
  });
});

// Task 3.5 — placing into container clears roomId

Deno.test("placing item into container clears stored roomId", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const container = await createItem({
      name: "Kiste",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const item = await createItem({
      name: "Buch",
      categoryId: null,
      roomId: ROOM_B,
      estimatedValue: null,
    });
    await updateItem(item.id, { containerId: container.id });
    const updated = await findItem(item.id);
    assertEquals(updated?.roomId, null);
    assertEquals(updated?.containerId, container.id);
  });
});

Deno.test("creating item inside container stores roomId as null", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const container = await createItem({
      name: "Kiste",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const item = await createItem({
      name: "Stift",
      categoryId: null,
      containerId: container.id,
      roomId: ROOM_B, // should be ignored
      estimatedValue: null,
    });
    assertEquals(item.roomId, null);
    assertEquals(item.containerId, container.id);
  });
});

// Task 3.6 — deleting container clears containerId on children

Deno.test("deleting container clears containerId on direct children", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const container = await createItem({
      name: "Kiste",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const child = await createItem({
      name: "Hammer",
      categoryId: null,
      containerId: container.id,
      roomId: null,
      estimatedValue: null,
    });
    await deleteItem(container.id);
    const updated = await findItem(child.id);
    assertEquals(updated?.containerId, null);
    assertEquals(updated?.roomId, null);
  });
});

Deno.test("deleting container with replacementRoomId sets roomId on children", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const container = await createItem({
      name: "Kiste",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const child = await createItem({
      name: "Säge",
      categoryId: null,
      containerId: container.id,
      roomId: null,
      estimatedValue: null,
    });
    await deleteItem(container.id, null, undefined, {
      replacementRoomId: ROOM_B,
    });
    const updated = await findItem(child.id);
    assertEquals(updated?.containerId, null);
    assertEquals(updated?.roomId, ROOM_B);
  });
});

// Task 4.1 — resolveRoom

Deno.test("resolveRoom returns roomId of root item", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const rootContainer = await createItem({
      name: "Schrank",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const nestedContainer = await createItem({
      name: "Box",
      categoryId: cat.id,
      containerId: rootContainer.id,
      roomId: null,
      estimatedValue: null,
    });
    const tool = await createItem({
      name: "Meisel",
      categoryId: null,
      containerId: nestedContainer.id,
      roomId: null,
      estimatedValue: null,
    });
    const resolved = await resolveRoom(tool);
    assertEquals(resolved, ROOM_A);
  });
});

Deno.test("resolveRoom returns null if root has no room", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const rootContainer = await createItem({
      name: "Schrank",
      categoryId: cat.id,
      roomId: null,
      estimatedValue: null,
    });
    const tool = await createItem({
      name: "Hammer",
      categoryId: null,
      containerId: rootContainer.id,
      roomId: null,
      estimatedValue: null,
    });
    const resolved = await resolveRoom(tool);
    assertEquals(resolved, null);
  });
});

// Task 4.2 — listItemsByRoom includes contained items

Deno.test("listItemsByRoom includes items transitively contained in that room", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    const cabinet = await createItem({
      name: "Schrank",
      categoryId: cat.id,
      roomId: ROOM_A,
      estimatedValue: null,
    });
    const box = await createItem({
      name: "Box",
      categoryId: cat.id,
      containerId: cabinet.id,
      roomId: null,
      estimatedValue: null,
    });
    const tool = await createItem({
      name: "Hammer",
      categoryId: null,
      containerId: box.id,
      roomId: null,
      estimatedValue: null,
    });
    const results = await listItemsByRoom(ROOM_A);
    const ids = results.map((i) => i.id);
    // Should include cabinet (root), box (direct child), tool (grandchild)
    assertEquals(ids.includes(cabinet.id), true);
    assertEquals(ids.includes(box.id), true);
    assertEquals(ids.includes(tool.id), true);
  });
});

Deno.test("listItemsByRoom does not include items in other rooms", async () => {
  await withKv(async () => {
    const cat = await createCategory("Kisten", "generic", true);
    await createItem({
      name: "Schrank B",
      categoryId: cat.id,
      roomId: ROOM_B,
      estimatedValue: null,
    });
    const results = await listItemsByRoom(ROOM_A);
    assertEquals(results.length, 0);
  });
});
