import type {
  CategorySchema,
  FieldDef,
  FieldType,
} from "@/lib/inventory/types.ts";

export class SchemaValidationError extends Error {}

const SLUG = /^[a-z0-9-]+$/;
// Field keys allow camelCase (built-ins use it: ageRange, waistCm, …): a
// letter followed by letters/digits.
const FIELD_KEY = /^[a-zA-Z][a-zA-Z0-9]*$/;
const FIELD_TYPES: FieldType[] = [
  "text",
  "number",
  "enum",
  "date",
  "boolean",
];

export interface SchemaInput {
  schemaType: string;
  label: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
  }>;
}

/**
 * Validate and normalize a user-submitted schema definition at the write
 * boundary. Returns a clean `CategorySchema` or throws SchemaValidationError.
 *
 * - `schemaType` and each field `key` must be non-empty slugs (`[a-z0-9-]+`).
 * - Field keys must be unique within the schema.
 * - Each field `type` must be one of the five allowed types.
 * - `enum` fields must declare at least one (non-empty) option.
 * - At least one field is required.
 */
export function validateSchemaDefinition(input: SchemaInput): CategorySchema {
  const schemaType = input.schemaType.trim();
  if (!SLUG.test(schemaType)) {
    throw new SchemaValidationError(
      "schemaType must be a non-empty slug ([a-z0-9-])",
    );
  }

  const label = input.label.trim();
  if (label === "") {
    throw new SchemaValidationError("Schema label must not be empty");
  }

  if (input.fields.length === 0) {
    throw new SchemaValidationError("A schema must have at least one field");
  }

  const seenKeys = new Set<string>();
  const fields: FieldDef[] = input.fields.map((raw) => {
    const key = raw.key.trim();
    if (!FIELD_KEY.test(key)) {
      throw new SchemaValidationError(
        `Field key '${raw.key}' must start with a letter and be alphanumeric`,
      );
    }
    if (seenKeys.has(key)) {
      throw new SchemaValidationError(`Duplicate field key '${key}'`);
    }
    seenKeys.add(key);

    if (!FIELD_TYPES.includes(raw.type as FieldType)) {
      throw new SchemaValidationError(
        `Field '${key}' has an unknown type '${raw.type}'`,
      );
    }
    const type = raw.type as FieldType;

    const fieldLabel = raw.label.trim();
    if (fieldLabel === "") {
      throw new SchemaValidationError(`Field '${key}' must have a label`);
    }

    if (type === "enum") {
      const options = (raw.options ?? [])
        .map((o) => o.trim())
        .filter((o) => o !== "");
      if (options.length === 0) {
        throw new SchemaValidationError(
          `Field '${key}' is single-select and needs at least one option`,
        );
      }
      return { key, label: fieldLabel, type, options };
    }

    return { key, label: fieldLabel, type };
  });

  return { schemaType, label, fields };
}
