#!/usr/bin/env -S deno run --allow-env --allow-read --unstable-kv
/**
 * One-shot migration: backfill canContain=false on all categories,
 * containerId=null on all items. Run once against live KV.
 */
import { getKv } from "@/lib/kv/client.ts";

const kv = await getKv();

let categories = 0;
for await (
  const entry of kv.list<Record<string, unknown>>({ prefix: ["category"] })
) {
  if (entry.key[0] !== "category" || entry.key.length !== 2) continue;
  const val = entry.value;
  if (typeof val === "object" && val !== null && !("canContain" in val)) {
    await kv.set(entry.key, { ...val, canContain: false });
    categories++;
  }
}

let items = 0;
for await (
  const entry of kv.list<Record<string, unknown>>({ prefix: ["item"] })
) {
  if (entry.key[0] !== "item" || entry.key.length !== 2) continue;
  const val = entry.value;
  if (typeof val === "object" && val !== null && !("containerId" in val)) {
    await kv.set(entry.key, { ...val, containerId: null });
    items++;
  }
}

console.log(
  `Migration complete: ${categories} categories, ${items} items backfilled.`,
);
kv.close();
