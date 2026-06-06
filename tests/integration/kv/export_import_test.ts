import { assertEquals, assertNotEquals } from "@std/assert";
import { exportKv } from "@/lib/kv/export.ts";
import { importKv } from "@/lib/kv/import.ts";
import { deleteAllKv } from "@/lib/kv/deleteAll.ts";

// ── 6.1: Round-trip: export → import, prefix exclusion ───────────────────────

Deno.test("export→import round-trip preserves all in-scope entries", async () => {
  const source = await Deno.openKv(":memory:");
  const dest = await Deno.openKv(":memory:");
  try {
    // Seed in-scope data
    await source.set(["item", "i1"], { name: "Sofa" });
    await source.set(["item-by-category", "c1", "i1"], true);
    await source.set(["box", "b1"], { code: "B-001" });
    await source.set(["room", "r1"], { name: "Wohnzimmer" });
    await source.set(["category", "c1"], { name: "Bücher" });
    await source.set(["user", "alice"], { username: "alice" });
    await source.set(["invite", "inv1"], { id: "inv1" });
    await source.set(["box-code-counter"], 5);
    // Seed excluded data
    await source.set(["session", "s1"], { sessionId: "s1" });
    await source.set(["session-by-user", "alice", "s1"], null);
    await source.set(["rate", "ip", "abc"], { count: 3 });

    // Export
    const lines: string[] = [];
    for await (const line of exportKv(source)) {
      lines.push(line);
    }

    // Excluded prefixes must not appear in export
    for (const line of lines) {
      const entry = JSON.parse(line);
      const first = entry.key[0] as string;
      assertNotEquals(first, "session");
      assertNotEquals(first, "session-by-user");
      assertNotEquals(first, "rate");
    }

    // Import into fresh KV
    async function* asGenerator(): AsyncGenerator<string> {
      for (const l of lines) yield l;
    }
    const { imported, skipped } = await importKv(dest, asGenerator());
    assertEquals(imported, 8); // 7 list entries + box-code-counter
    assertEquals(skipped, 0);

    // Verify round-trip fidelity
    const item = await dest.get(["item", "i1"]);
    assertEquals(item.value, { name: "Sofa" });
    const counter = await dest.get(["box-code-counter"]);
    assertEquals(counter.value, 5);

    // Excluded entries must not be in dest
    const session = await dest.get(["session", "s1"]);
    assertEquals(session.value, null);
    const rate = await dest.get(["rate", "ip", "abc"]);
    assertEquals(rate.value, null);
  } finally {
    source.close();
    dest.close();
  }
});

// ── 6.2: Idempotency ──────────────────────────────────────────────────────────

Deno.test("importKv twice with same lines is idempotent", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await kv.set(["item", "i1"], { name: "Sofa" });
    const lines: string[] = [];
    for await (const line of exportKv(kv)) {
      lines.push(line);
    }

    async function* asGenerator(): AsyncGenerator<string> {
      for (const l of lines) yield l;
    }

    const first = await importKv(kv, asGenerator());
    const second = await importKv(kv, asGenerator());

    assertEquals(first.imported, second.imported);
    assertEquals(first.skipped, second.skipped);

    // Data is unchanged after second import
    const item = await kv.get(["item", "i1"]);
    assertEquals(item.value, { name: "Sofa" });

    // No duplicate entries
    const all: unknown[] = [];
    for await (const e of kv.list({ prefix: ["item"] })) all.push(e);
    assertEquals(all.length, 1);
  } finally {
    kv.close();
  }
});

// ── 6.3: deleteAllKv ─────────────────────────────────────────────────────────

Deno.test("deleteAllKv wipes in-scope data, leaves session and rate intact", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    // In-scope
    await kv.set(["item", "i1"], { name: "Sofa" });
    await kv.set(["box", "b1"], { code: "B-001" });
    await kv.set(["room", "r1"], { name: "Wohnzimmer" });
    await kv.set(["box-code-counter"], 3);
    // Excluded
    await kv.set(["session", "s1"], { sessionId: "s1" });
    await kv.set(["session-by-user", "alice", "s1"], null);
    await kv.set(["rate", "ip", "abc"], { count: 2 });

    const { deleted } = await deleteAllKv(kv);
    assertEquals(deleted, 4); // 3 list entries + box-code-counter

    // In-scope gone
    assertEquals((await kv.get(["item", "i1"])).value, null);
    assertEquals((await kv.get(["box", "b1"])).value, null);
    assertEquals((await kv.get(["box-code-counter"])).value, null);

    // Excluded preserved
    assertEquals(
      (await kv.get(["session", "s1"])).value,
      { sessionId: "s1" },
    );
    assertEquals((await kv.get(["rate", "ip", "abc"])).value, { count: 2 });
  } finally {
    kv.close();
  }
});
