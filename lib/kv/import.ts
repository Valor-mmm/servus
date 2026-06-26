const SKIP_PREFIXES = new Set(["session", "session-by-user", "rate"]);
const BATCH_SIZE = 50;

export class ImportParseError extends Error {
  constructor(public readonly malformed: number) {
    super(`Import aborted: ${malformed} malformed line(s) found`);
    this.name = "ImportParseError";
  }
}

export async function importKv(
  kv: Deno.Kv,
  lines: AsyncIterable<string>,
): Promise<{ imported: number; skipped: number }> {
  let skipped = 0;
  let malformed = 0;
  const entries: Array<{ key: Deno.KvKey; value: unknown }> = [];

  // Parse all lines first — make it all-or-nothing
  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry: { key: Deno.KvKey; value: unknown };
    try {
      entry = JSON.parse(trimmed) as { key: Deno.KvKey; value: unknown };
    } catch {
      malformed++;
      continue;
    }

    if (SKIP_PREFIXES.has(entry.key[0] as string)) {
      skipped++;
      continue;
    }

    entries.push({ key: entry.key, value: entry.value });
  }

  if (malformed > 0) {
    throw new ImportParseError(malformed);
  }

  // Flush in batches
  let imported = 0;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const op = kv.atomic();
    for (const { key, value } of batch) {
      op.set(key, value);
    }
    await op.commit();
    imported += batch.length;
  }

  return { imported, skipped };
}
