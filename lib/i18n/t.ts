import de from "./locales/de.ts";

type TranslationKey = keyof typeof de;

export function t(
  key: TranslationKey,
  params?: Record<string, string>,
): string {
  const value: string = de[key];
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}

export function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Translate a key known only at runtime (e.g. category-schema field labels from
 * `lib/inventory/schemas.ts`). Still resolves against `de.ts` — the single
 * source of copy — but skips the compile-time key check. Falls back to the raw
 * key if it is missing so a forgotten string is visible, not a crash.
 */
export function td(key: string, params?: Record<string, string>): string {
  const value = (de as Record<string, string>)[key];
  if (value === undefined) return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}
