import { assertEquals, assertRejects } from "@std/assert";
import { importKv, ImportParseError } from "@/lib/kv/import.ts";

async function* withBlanks(): AsyncGenerator<string> {
  yield "";
  yield JSON.stringify({
    key: ["item", "i1"],
    value: { name: "Sofa" },
    versionstamp: "0",
  });
  yield "   ";
}

async function* linesOf(
  entries: Array<{ key: Deno.KvKey; value: unknown }>,
): AsyncGenerator<string> {
  for (const e of entries) {
    yield JSON.stringify({ key: e.key, value: e.value, versionstamp: "0" });
  }
}

Deno.test("importKv: writes in-scope entries to KV", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const result = await importKv(
      kv,
      linesOf([
        { key: ["item", "i1"], value: { name: "Sofa" } },
        { key: ["box", "b1"], value: { code: "B-001" } },
      ]),
    );
    assertEquals(result.imported, 2);
    assertEquals(result.skipped, 0);
    const item = await kv.get(["item", "i1"]);
    assertEquals(item.value, { name: "Sofa" });
    const box = await kv.get(["box", "b1"]);
    assertEquals(box.value, { code: "B-001" });
  } finally {
    kv.close();
  }
});

Deno.test("importKv: skips session, session-by-user, rate entries", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const result = await importKv(
      kv,
      linesOf([
        { key: ["session", "s1"], value: { sessionId: "s1" } },
        { key: ["session-by-user", "alice", "s1"], value: null },
        { key: ["rate", "ip", "abc"], value: { count: 5 } },
        { key: ["item", "i1"], value: { name: "Sofa" } },
      ]),
    );
    assertEquals(result.imported, 1);
    assertEquals(result.skipped, 3);
    const session = await kv.get(["session", "s1"]);
    assertEquals(session.value, null);
    const item = await kv.get(["item", "i1"]);
    assertEquals(item.value, { name: "Sofa" });
  } finally {
    kv.close();
  }
});

Deno.test("importKv: is idempotent (second run overwrites, no error)", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const lines = [{
      key: ["item", "i1"] as Deno.KvKey,
      value: { name: "Sofa" },
    }];
    await importKv(kv, linesOf(lines));
    const result2 = await importKv(kv, linesOf(lines));
    assertEquals(result2.imported, 1);
    assertEquals(result2.skipped, 0);
    const item = await kv.get(["item", "i1"]);
    assertEquals(item.value, { name: "Sofa" });
  } finally {
    kv.close();
  }
});

Deno.test("importKv: batches >50 entries without error", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const entries = Array.from({ length: 75 }, (_, i) => ({
      key: ["item", `i${i}`] as Deno.KvKey,
      value: { name: `Item ${i}` },
    }));
    const result = await importKv(kv, linesOf(entries));
    assertEquals(result.imported, 75);
    assertEquals(result.skipped, 0);
    // Spot-check a few
    const first = await kv.get(["item", "i0"]);
    assertEquals(first.value, { name: "Item 0" });
    const last = await kv.get(["item", "i74"]);
    assertEquals(last.value, { name: "Item 74" });
  } finally {
    kv.close();
  }
});

Deno.test("importKv: skips blank lines without error", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const result = await importKv(kv, withBlanks());
    assertEquals(result.imported, 1);
  } finally {
    kv.close();
  }
});

Deno.test("importKv: malformed line aborts import and writes nothing", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    async function* malformedStream(): AsyncGenerator<string> {
      yield JSON.stringify({ key: ["item", "good"], value: { name: "Sofa" } });
      yield "THIS IS NOT JSON {{{";
      yield JSON.stringify({
        key: ["item", "good2"],
        value: { name: "Regal" },
      });
    }

    await assertRejects(
      () => importKv(kv, malformedStream()),
      ImportParseError,
      "malformed",
    );

    // Nothing should have been written (all-or-nothing)
    const good = await kv.get(["item", "good"]);
    assertEquals(
      good.value,
      null,
      "valid entry must not be written when stream has malformed lines",
    );
    const good2 = await kv.get(["item", "good2"]);
    assertEquals(good2.value, null);
  } finally {
    kv.close();
  }
});
