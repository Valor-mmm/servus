import { assertEquals } from "@std/assert";
import { deleteAllKv } from "@/lib/kv/deleteAll.ts";

Deno.test("deleteAllKv: deletes all in-scope entries", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await kv.set(["item", "i1"], { name: "Sofa" });
    await kv.set(["box", "b1"], { code: "B-001" });
    await kv.set(["room", "r1"], { name: "Wohnzimmer" });
    await kv.set(["box-code-counter"], 1);

    const result = await deleteAllKv(kv);
    assertEquals(result.deleted, 4);

    const item = await kv.get(["item", "i1"]);
    assertEquals(item.value, null);
    const box = await kv.get(["box", "b1"]);
    assertEquals(box.value, null);
    const counter = await kv.get(["box-code-counter"]);
    assertEquals(counter.value, null);
  } finally {
    kv.close();
  }
});

Deno.test("deleteAllKv: preserves session, session-by-user, rate entries", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await kv.set(["session", "s1"], { sessionId: "s1" });
    await kv.set(["session-by-user", "alice", "s1"], null);
    await kv.set(["rate", "ip", "abc"], { count: 5 });
    await kv.set(["item", "i1"], { name: "Sofa" });

    const result = await deleteAllKv(kv);
    assertEquals(result.deleted, 1);

    // Auth entries untouched
    const session = await kv.get(["session", "s1"]);
    assertEquals(session.value, { sessionId: "s1" });
    const rate = await kv.get(["rate", "ip", "abc"]);
    assertEquals(rate.value, { count: 5 });
    // In-scope entry gone
    const item = await kv.get(["item", "i1"]);
    assertEquals(item.value, null);
  } finally {
    kv.close();
  }
});

Deno.test("deleteAllKv: returned count matches number of deleted entries", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    for (let i = 0; i < 10; i++) {
      await kv.set(["item", `i${i}`], { name: `Item ${i}` });
    }
    for (let i = 0; i < 5; i++) {
      await kv.set(["room", `r${i}`], { name: `Room ${i}` });
    }
    const result = await deleteAllKv(kv);
    assertEquals(result.deleted, 15);
  } finally {
    kv.close();
  }
});

Deno.test("deleteAllKv: empty store returns deleted count 0", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const result = await deleteAllKv(kv);
    assertEquals(result.deleted, 0);
  } finally {
    kv.close();
  }
});

Deno.test("deleteAllKv: handles >50 entries in batches", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    for (let i = 0; i < 75; i++) {
      await kv.set(["item", `i${i}`], { name: `Item ${i}` });
    }
    const result = await deleteAllKv(kv);
    assertEquals(result.deleted, 75);
    const remaining = kv.list({ prefix: ["item"] });
    const entries = [];
    for await (const e of remaining) entries.push(e);
    assertEquals(entries.length, 0);
  } finally {
    kv.close();
  }
});
