export const EXPORT_PREFIXES: Deno.KvKey[] = [
  ["item"],
  ["item-by-category"],
  ["item-by-room"],
  ["item-by-box"],
  ["item-by-time"],
  ["box"],
  ["box-by-code"],
  ["box-tombstone"],
  ["room"],
  ["room-by-name"],
  ["category"],
  ["category-by-name"],
  ["user"],
  ["invite"],
  ["invite-by-code"],
  ["invite-by-expiry"],
];

export const EXCLUDE_PREFIXES: Deno.KvKey[] = [
  ["session"],
  ["session-by-user"],
  ["rate"],
];

export async function* exportKv(kv: Deno.Kv): AsyncGenerator<string> {
  for (const prefix of EXPORT_PREFIXES) {
    for await (const entry of kv.list({ prefix })) {
      yield JSON.stringify({
        key: [...entry.key],
        value: entry.value,
        versionstamp: entry.versionstamp,
      });
    }
  }
  // box-code-counter is a single key, not a listable prefix
  const counter = await kv.get(["box-code-counter"]);
  if (counter.value !== null) {
    yield JSON.stringify({
      key: ["box-code-counter"],
      value: counter.value,
      versionstamp: counter.versionstamp,
    });
  }
}
