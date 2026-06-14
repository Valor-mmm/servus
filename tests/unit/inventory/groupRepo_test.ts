import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import {
  createGroup,
  deleteGroup,
  findGroup,
  listGroups,
  renameGroup,
} from "@/lib/inventory/groupRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

Deno.test("createGroup returns a group with id and timestamps", async () => {
  await withKv(async () => {
    const g = await createGroup("Campingkram");
    assertExists(g.id);
    assertEquals(g.name, "Campingkram");
    assertEquals(g.note, null);
    assertEquals(typeof g.createdAt, "number");
    assertEquals(typeof g.updatedAt, "number");
  });
});

Deno.test("createGroup rejects a duplicate name (case-insensitive)", async () => {
  await withKv(async () => {
    await createGroup("Harry Potter");
    await assertRejects(
      () => createGroup("harry potter"),
      Error,
      "already exists",
    );
  });
});

Deno.test("findGroup / listGroups", async () => {
  await withKv(async () => {
    const a = await createGroup("Beta");
    await createGroup("Alpha");
    assertEquals((await findGroup(a.id))?.name, "Beta");
    const list = await listGroups();
    assertEquals(list.map((g) => g.name), ["Alpha", "Beta"]); // sorted
  });
});

Deno.test("renameGroup updates name and frees the old name", async () => {
  await withKv(async () => {
    const g = await createGroup("Altname");
    const renamed = await renameGroup(g.id, "Neuname");
    assertEquals(renamed.name, "Neuname");
    // old name is free to reuse
    const other = await createGroup("Altname");
    assertExists(other.id);
    // new duplicate is rejected
    await assertRejects(() => createGroup("neuname"), Error, "already exists");
  });
});

Deno.test("deleteGroup removes the group", async () => {
  await withKv(async () => {
    const g = await createGroup("Weg");
    await deleteGroup(g.id);
    assertEquals(await findGroup(g.id), null);
  });
});
