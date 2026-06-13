import type { SchemaInput } from "@/lib/inventory/validateSchema.ts";

const UMLAUTS: Record<string, string> = {
  "ä": "ae",
  "ö": "oe",
  "ü": "ue",
  "ß": "ss",
  "Ä": "ae",
  "Ö": "oe",
  "Ü": "ue",
};

/** Derive a stable machine key from a free-text label (camel/lower, ASCII). */
export function slugifyKey(label: string, fallbackIndex: number): string {
  const mapped = label.replace(/[äöüßÄÖÜ]/g, (c) => UMLAUTS[c] ?? c);
  const cleaned = mapped.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned === "" || !/^[a-z]/.test(cleaned)) {
    return `field${fallbackIndex}`;
  }
  return cleaned;
}

/** Derive a slug schemaType id from a type name. */
export function slugifySchemaType(name: string): string {
  const mapped = name.replace(/[äöüßÄÖÜ]/g, (c) => UMLAUTS[c] ?? c);
  return mapped.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
    /^-+|-+$/g,
    "",
  );
}

/**
 * Build a `SchemaInput` from a submitted editor form. Field rows are indexed
 * (`field_label_0`, `field_type_0`, `field_options_0`, optional hidden
 * `field_key_0`). Rows with an empty label are skipped. Existing fields carry
 * their original key (so item metadata stays valid); new rows derive a key from
 * the label, de-duplicated within the schema.
 */
export function readSchemaInputFromForm(
  form: FormData,
  schemaType: string,
): SchemaInput {
  const label = ((form.get("name") as string | null) ?? "").trim();

  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^field_label_(\d+)$/);
    if (m) indices.add(Number(m[1]));
  }

  const seenKeys = new Set<string>();
  const fields: SchemaInput["fields"] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const fieldLabel = ((form.get(`field_label_${i}`) as string | null) ?? "")
      .trim();
    if (fieldLabel === "") continue;

    const type = ((form.get(`field_type_${i}`) as string | null) ?? "text")
      .trim();
    const existingKey = ((form.get(`field_key_${i}`) as string | null) ?? "")
      .trim();

    let key = existingKey || slugifyKey(fieldLabel, i);
    if (seenKeys.has(key)) key = `${key}${i}`;
    seenKeys.add(key);

    const options = type === "enum"
      ? ((form.get(`field_options_${i}`) as string | null) ?? "")
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o !== "")
      : undefined;

    fields.push({ key, label: fieldLabel, type, options });
  }

  return { schemaType, label, fields };
}
