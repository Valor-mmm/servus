import type { CategorySchema, FieldDef } from "@/lib/inventory/types.ts";

export class MetadataValidationError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) &&
    value === d.toISOString().slice(0, 10);
}

/**
 * Validate the core `warrantyUntil` item field: an ISO calendar date or null.
 * Empty / absent input is treated as "no warranty" (null).
 */
export function validateWarrantyDate(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  if (!isIsoCalendarDate(s)) {
    throw new MetadataValidationError("warrantyUntil must be an ISO date");
  }
  return s;
}

function coerceField(field: FieldDef, raw: unknown): unknown | undefined {
  // Absent / empty → omit (no nulls stored).
  if (raw === undefined || raw === null) return undefined;

  switch (field.type) {
    case "text": {
      const s = String(raw).trim();
      return s === "" ? undefined : s;
    }
    case "number": {
      const s = String(raw).trim();
      if (s === "") return undefined;
      const n = Number(s);
      if (!Number.isFinite(n)) {
        throw new MetadataValidationError(
          `Field '${field.key}' must be a number`,
        );
      }
      return n;
    }
    case "boolean": {
      if (typeof raw === "boolean") return raw;
      const s = String(raw).trim().toLowerCase();
      if (s === "") return undefined;
      if (s === "true" || s === "on" || s === "1") return true;
      if (s === "false" || s === "off" || s === "0") return false;
      throw new MetadataValidationError(
        `Field '${field.key}' must be a boolean`,
      );
    }
    case "date": {
      const s = String(raw).trim();
      if (s === "") return undefined;
      if (!isIsoCalendarDate(s)) {
        throw new MetadataValidationError(
          `Field '${field.key}' must be an ISO date`,
        );
      }
      return s;
    }
    case "enum": {
      const s = String(raw).trim();
      if (s === "") return undefined;
      if (!(field.options ?? []).includes(s)) {
        throw new MetadataValidationError(
          `Field '${field.key}' has an invalid value`,
        );
      }
      return s;
    }
  }
}

/**
 * Validate submitted metadata against a category schema at the write boundary.
 *
 * - Keys not defined by the schema are dropped silently (the schema is the
 *   contract, not the client payload).
 * - Each retained value is coerced/validated to its field type.
 * - Empty / absent fields are omitted entirely (never stored as null).
 *
 * Throws MetadataValidationError when a present value does not conform.
 */
export function validateMetadata(
  schema: CategorySchema,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const value = coerceField(field, input[field.key]);
    if (value !== undefined) out[field.key] = value;
  }
  return out;
}
