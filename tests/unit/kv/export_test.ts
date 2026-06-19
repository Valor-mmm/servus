import { assert, assertEquals } from "@std/assert";
import { EXPORT_PREFIXES, exportKv } from "@/lib/kv/export.ts";

Deno.test("exportKv: NDJSON line format includes key, value, versionstamp", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await kv.set(["item", "abc"], { name: "Sofa" });
    const lines: string[] = [];
    for await (const line of exportKv(kv)) {
      lines.push(line);
    }
    assertEquals(lines.length, 1);
    const parsed = JSON.parse(lines[0]);
    assertEquals(parsed.key, ["item", "abc"]);
    assertEquals(parsed.value, { name: "Sofa" });
    assertEquals(typeof parsed.versionstamp, "string");
    assert(parsed.versionstamp.length > 0);
  } finally {
    kv.close();
  }
});

Deno.test("exportKv: all EXPORT_PREFIXES entries appear in output", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await kv.set(["item", "i1"], { name: "item" });
    await kv.set(["item-by-category", "c1", "i1"], true);
    await kv.set(["item-by-room", "r1", "i1"], true);
    await kv.set(["item-by-box", "b1", "i1"], true);
    await kv.set(["item-by-time", 1234, "i1"], true);
    await kv.set(["item-by-container", "c1", "i1"], true);
    await kv.set(["item-group", "i1", "g1"], true);
    await kv.set(["category-schema", "cat1"], { fields: [] });
    await kv.set(["group", "g1"], { id: "g1", name: "Test" });
    await kv.set(["group-item", "g1", "i1"], { itemId: "i1", groupId: "g1" });
    await kv.set(["box", "b1"], { code: "B-001" });
    await kv.set(["box-by-code", "B-001"], "b1");
    await kv.set(["box-tombstone", "b0"], { code: "B-000" });
    await kv.set(["room", "r1"], { name: "Wohnzimmer" });
    await kv.set(["room-by-name", "wohnzimmer"], "r1");
    await kv.set(["category", "c1"], { name: "Bücher" });
    await kv.set(["category-by-name", "bücher"], "c1");
    await kv.set(["user", "alice"], { username: "alice" });
    await kv.set(["invite", "inv1"], { id: "inv1" });
    await kv.set(["invite-by-code", "code1"], "inv1");
    await kv.set(
      ["invite-by-expiry", "2025-01-01T00:00:00.000Z", "inv1"],
      true,
    );
    await kv.set(["box-code-counter"], 1);

    const lines: string[] = [];
    for await (const line of exportKv(kv)) {
      lines.push(line);
    }

    const firstSegments = lines.map((l) => JSON.parse(l).key[0] as string);

    for (const prefix of EXPORT_PREFIXES) {
      assert(
        firstSegments.includes(prefix[0] as string),
        `Missing prefix: ${String(prefix[0])}`,
      );
    }
    // box-code-counter is a single key, included separately
    assert(
      lines.some((l) => {
        const p = JSON.parse(l);
        return Array.isArray(p.key) && p.key[0] === "box-code-counter" &&
          p.key.length === 1;
      }),
      "Missing box-code-counter entry",
    );
  } finally {
    kv.close();
  }
});

Deno.test("exportKv: excludes session, session-by-user, rate prefixes", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await kv.set(["session", "s1"], { sessionId: "s1" });
    await kv.set(["session-by-user", "alice", "s1"], null);
    await kv.set(["rate", "ip", "abc"], { count: 5 });
    await kv.set(["item", "i1"], { name: "visible" });

    const lines: string[] = [];
    for await (const line of exportKv(kv)) {
      lines.push(line);
    }

    assertEquals(lines.length, 1);
    assertEquals(JSON.parse(lines[0]).key[0], "item");
  } finally {
    kv.close();
  }
});

Deno.test("exportKv: box-code-counter NOT included when absent", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    // No box-code-counter set
    const lines: string[] = [];
    for await (const line of exportKv(kv)) {
      lines.push(line);
    }
    assertEquals(lines.length, 0);
  } finally {
    kv.close();
  }
});

Deno.test("exportKv: empty store produces zero lines", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const lines: string[] = [];
    for await (const line of exportKv(kv)) {
      lines.push(line);
    }
    assertEquals(lines.length, 0);
  } finally {
    kv.close();
  }
});

// All kv.list prefixes used in lib/inventory/ must appear in EXPORT_PREFIXES.
// This regression test prevents silent data loss when new KV prefixes are added
// without updating the export list.
Deno.test("EXPORT_PREFIXES covers all kv.list prefixes used in lib/inventory/", () => {
  const exportedRoots = new Set(
    EXPORT_PREFIXES.map((p) => p[0] as string),
  );

  const inventoryPrefixes = [
    "item",
    "item-by-category",
    "item-by-room",
    "item-by-box",
    "item-by-time",
    "item-by-container",
    "item-group",
    "group",
    "group-item",
    "category-schema",
  ];

  for (const prefix of inventoryPrefixes) {
    assert(
      exportedRoots.has(prefix),
      `Prefix "${prefix}" used in lib/inventory/ is missing from EXPORT_PREFIXES`,
    );
  }
});
