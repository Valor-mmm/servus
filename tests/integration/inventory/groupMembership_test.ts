import { assertEquals } from "@std/assert";
import { closeKv, getKv, setKv } from "@/lib/kv/client.ts";
import {
  addMembership,
  createGroup,
  deleteGroup,
  listItemGroups,
  listMembers,
  removeMembership,
  reorderMembers,
} from "@/lib/inventory/groupRepo.ts";
import { createItem, deleteItem } from "@/lib/inventory/itemRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

function makeItem(name: string) {
  return createItem({
    name,
    categoryId: null,
    roomId: null,
    estimatedValue: null,
  });
}

Deno.test("addMembership links both directions", async () => {
  await withKv(async () => {
    const g = await createGroup("Campingkram");
    const item = await makeItem("Zelt");
    await addMembership(g.id, item.id);

    assertEquals((await listMembers(g.id)).map((i) => i.id), [item.id]);
    assertEquals((await listItemGroups(item.id)).map((x) => x.id), [g.id]);
  });
});

Deno.test("addMembership is idempotent", async () => {
  await withKv(async () => {
    const g = await createGroup("G");
    const item = await makeItem("X");
    await addMembership(g.id, item.id);
    await addMembership(g.id, item.id);
    assertEquals((await listMembers(g.id)).length, 1);
  });
});

Deno.test("removeMembership clears both sides, keeps records", async () => {
  await withKv(async () => {
    const g = await createGroup("G");
    const item = await makeItem("X");
    await addMembership(g.id, item.id);
    await removeMembership(g.id, item.id);

    assertEquals((await listMembers(g.id)).length, 0);
    assertEquals((await listItemGroups(item.id)).length, 0);
    // both records survive
    const kv = await getKv();
    assertEquals((await kv.get(["group", g.id])).value !== null, true);
    assertEquals((await kv.get(["item", item.id])).value !== null, true);
  });
});

Deno.test("listMembers returns members ordered by position; reorder persists", async () => {
  await withKv(async () => {
    const g = await createGroup("Reihe");
    const a = await makeItem("A");
    const b = await makeItem("B");
    const c = await makeItem("C");
    await addMembership(g.id, a.id);
    await addMembership(g.id, b.id);
    await addMembership(g.id, c.id);
    // append order
    assertEquals((await listMembers(g.id)).map((i) => i.name), ["A", "B", "C"]);

    await reorderMembers(g.id, [c.id, a.id, b.id]);
    assertEquals((await listMembers(g.id)).map((i) => i.name), ["C", "A", "B"]);
  });
});

// ── Cascade cleanup ─────────────────────────────────────────────────────────

Deno.test("deleting a group removes memberships but keeps items", async () => {
  await withKv(async () => {
    const g = await createGroup("Weg");
    const item = await makeItem("Bleibt");
    await addMembership(g.id, item.id);

    await deleteGroup(g.id);

    assertEquals((await listItemGroups(item.id)).length, 0);
    const kv = await getKv();
    assertEquals((await kv.get(["item", item.id])).value !== null, true);
    // no orphaned group-item entry
    let groupItemCount = 0;
    for await (const _ of kv.list({ prefix: ["group-item", g.id] })) {
      groupItemCount++;
    }
    assertEquals(groupItemCount, 0);
  });
});

Deno.test("deleting an item removes its memberships from both sides", async () => {
  await withKv(async () => {
    const g1 = await createGroup("G1");
    const g2 = await createGroup("G2");
    const item = await makeItem("Weg");
    await addMembership(g1.id, item.id);
    await addMembership(g2.id, item.id);

    await deleteItem(item.id);

    assertEquals((await listMembers(g1.id)).length, 0);
    assertEquals((await listMembers(g2.id)).length, 0);
    const kv = await getKv();
    let itemGroupCount = 0;
    for await (const _ of kv.list({ prefix: ["item-group", item.id] })) {
      itemGroupCount++;
    }
    assertEquals(itemGroupCount, 0);
  });
});
