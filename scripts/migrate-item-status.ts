import { getKv } from "@/lib/kv/client.ts";

export interface MigrateItemStatusResult {
  migrated: number;
  skipped: number;
}

const STATUS_MAP: Record<string, "incomplete" | "complete"> = {
  pending: "incomplete",
  suggested: "complete",
  confirmed: "complete",
};

export async function migrateItemStatus(
  kv: Deno.Kv,
): Promise<MigrateItemStatusResult> {
  let migrated = 0;
  let skipped = 0;

  for await (
    const entry of kv.list<Record<string, unknown>>({ prefix: ["item"] })
  ) {
    if (entry.key[0] !== "item" || entry.key.length !== 2) continue;
    const item = entry.value;
    if (!item || typeof item !== "object") continue;

    const status = item.status as string | undefined;
    if (status === "incomplete" || status === "complete") {
      skipped++;
      continue;
    }

    const newStatus = STATUS_MAP[status ?? ""] ?? "complete";
    await kv.set(entry.key, { ...item, status: newStatus });
    migrated++;
  }

  return { migrated, skipped };
}

if (import.meta.main) {
  const kv = await getKv();
  const result = await migrateItemStatus(kv);
  console.log(
    `Migration complete: ${result.migrated} migrated, ${result.skipped} skipped`,
  );
  kv.close();
}
