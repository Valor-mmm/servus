import { EXPORT_PREFIXES } from "@/lib/kv/export.ts";

const BATCH_SIZE = 50;

export async function deleteAllKv(
  kv: Deno.Kv,
): Promise<{ deleted: number }> {
  let deleted = 0;
  let batch: Deno.KvKey[] = [];

  async function flush() {
    if (batch.length === 0) return;
    const op = kv.atomic();
    for (const key of batch) {
      op.delete(key);
    }
    await op.commit();
    deleted += batch.length;
    batch = [];
  }

  for (const prefix of EXPORT_PREFIXES) {
    for await (const entry of kv.list({ prefix })) {
      batch.push([...entry.key]);
      if (batch.length >= BATCH_SIZE) await flush();
    }
  }

  // box-code-counter is a single key outside the listable prefixes
  const counter = await kv.get(["box-code-counter"]);
  if (counter.value !== null) {
    batch.push(["box-code-counter"]);
  }

  await flush();
  return { deleted };
}
