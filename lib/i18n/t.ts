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
