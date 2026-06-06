const SKIP_PREFIXES = new Set(["session", "session-by-user", "rate"]);
const BATCH_SIZE = 50;

export async function importKv(
  kv: Deno.Kv,
  lines: AsyncIterable<string>,
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;
  let batch: Array<{ key: Deno.KvKey; value: unknown }> = [];

  async function flush() {
    if (batch.length === 0) return;
    const op = kv.atomic();
    for (const { key, value } of batch) {
      op.set(key, value);
    }
    await op.commit();
    imported += batch.length;
    batch = [];
  }

  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const entry = JSON.parse(trimmed) as {
      key: Deno.KvKey;
      value: unknown;
    };

    if (SKIP_PREFIXES.has(entry.key[0] as string)) {
      skipped++;
      continue;
    }

    batch.push({ key: entry.key, value: entry.value });
    if (batch.length >= BATCH_SIZE) await flush();
  }

  await flush();
  return { imported, skipped };
}
