import { assertEquals } from "@std/assert";
import { migrateItemStatus } from "@/scripts/migrate-item-status.ts";

Deno.test("migrateItemStatus: pending → incomplete, confirmed → complete, suggested → complete", async () => {
  const kv = await Deno.openKv(":memory:");

  // deno-lint-ignore no-explicit-any
  const pending: any = {
    id: "a",
    name: "",
    status: "pending",
    createdAt: 1,
    updatedAt: 1,
    categoryId: null,
    containerId: null,
    roomId: null,
    boxId: null,
    quantity: 1,
    estimatedValue: null,
    warrantyUntil: null,
    metadata: {},
    photos: [],
  };
  // deno-lint-ignore no-explicit-any
  const confirmed: any = {
    ...pending,
    id: "b",
    name: "Sofa",
    status: "confirmed",
  };
  // deno-lint-ignore no-explicit-any
  const suggested: any = {
    ...pending,
    id: "c",
    name: "Tisch",
    status: "suggested",
  };

  await kv.set(["item", "a"], pending);
  await kv.set(["item", "b"], confirmed);
  await kv.set(["item", "c"], suggested);

  const result = await migrateItemStatus(kv);

  assertEquals(result.migrated, 3);
  assertEquals(result.skipped, 0);

  const a = (await kv.get(["item", "a"])).value as { status: string };
  const b = (await kv.get(["item", "b"])).value as { status: string };
  const c = (await kv.get(["item", "c"])).value as { status: string };

  assertEquals(a.status, "incomplete");
  assertEquals(b.status, "complete");
  assertEquals(c.status, "complete");

  kv.close();
});

Deno.test("migrateItemStatus: already-migrated items are skipped (idempotent)", async () => {
  const kv = await Deno.openKv(":memory:");

  const complete = {
    id: "x",
    name: "Couch",
    status: "complete",
    createdAt: 1,
    updatedAt: 1,
    categoryId: null,
    containerId: null,
    roomId: null,
    boxId: null,
    quantity: 1,
    estimatedValue: null,
    warrantyUntil: null,
    metadata: {},
    photos: [],
  };
  const incomplete = { ...complete, id: "y", status: "incomplete" };

  await kv.set(["item", "x"], complete);
  await kv.set(["item", "y"], incomplete);

  const result = await migrateItemStatus(kv);

  assertEquals(result.migrated, 0);
  assertEquals(result.skipped, 2);

  kv.close();
});
