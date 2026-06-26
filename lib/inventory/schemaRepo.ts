import { getKv } from "@/lib/kv/client.ts";
import { td } from "@/lib/i18n/t.ts";
import type { CategorySchema } from "@/lib/inventory/types.ts";
import {
  GENERIC_TYPE,
  getSchema,
  isBuiltinSchemaType,
  listSeedSchemaTypes,
} from "@/lib/inventory/schemas.ts";
import {
  type SchemaInput,
  SchemaValidationError,
  validateSchemaDefinition,
} from "@/lib/inventory/validateSchema.ts";

// User-editable schema overlay. Resolution checks this first, then the seeded
// built-in catalogue. Built-in labels/options are i18n keys; stored (user or
// overridden) ones are literal display text — `td()` renders both correctly.

const SCHEMA_KEY = (schemaType: string): Deno.KvKey => [
  "category-schema",
  schemaType,
];

type SchemaOrigin = "user" | "builtin-override";

interface StoredCategorySchema extends CategorySchema {
  origin: SchemaOrigin;
  createdAt: number;
  updatedAt: number;
}

function toCategorySchema(s: StoredCategorySchema): CategorySchema {
  return { schemaType: s.schemaType, label: s.label, fields: s.fields };
}

/** Resolve a schema: overlay first, then seeded built-in, then generic. */
export async function resolveSchema(
  schemaType: string,
): Promise<CategorySchema> {
  const kv = await getKv();
  const stored = await kv.get<StoredCategorySchema>(SCHEMA_KEY(schemaType));
  if (stored.value) return toCategorySchema(stored.value);
  return getSchema(schemaType);
}

/** True if the schemaType is usable (built-in seed or stored overlay). */
export async function schemaTypeExists(schemaType: string): Promise<boolean> {
  if (isBuiltinSchemaType(schemaType)) return true;
  const kv = await getKv();
  const stored = await kv.get(SCHEMA_KEY(schemaType));
  return stored.value !== null;
}

export interface SchemaTypeListing {
  schemaType: string;
  label: string;
  source: "builtin" | "user";
}

/** Built-ins merged with the overlay (overlay wins on id), in catalogue order. */
export async function listSchemaTypes(): Promise<SchemaTypeListing[]> {
  const kv = await getKv();
  const overlay = new Map<string, StoredCategorySchema>();
  for await (
    const e of kv.list<StoredCategorySchema>({ prefix: ["category-schema"] })
  ) {
    overlay.set(e.value.schemaType, e.value);
  }

  const result: SchemaTypeListing[] = [];
  for (const seed of listSeedSchemaTypes()) {
    const ov = overlay.get(seed.schemaType);
    if (ov) {
      result.push({
        schemaType: ov.schemaType,
        label: ov.label,
        source: "user",
      });
      overlay.delete(seed.schemaType);
    } else {
      result.push({ ...seed, source: "builtin" });
    }
  }
  for (const ov of overlay.values()) {
    result.push({ schemaType: ov.schemaType, label: ov.label, source: "user" });
  }
  return result;
}

/** Only the user-defined / overridden schemas (for the editor's list page). */
export async function listUserSchemas(): Promise<CategorySchema[]> {
  const kv = await getKv();
  const out: CategorySchema[] = [];
  for await (
    const e of kv.list<StoredCategorySchema>({ prefix: ["category-schema"] })
  ) {
    out.push(toCategorySchema(e.value));
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Returns a schema with literal labels suitable for the edit form. For a stored
 * overlay this is the stored value; for a built-in it resolves the seed's i18n
 * keys to literal German via `td()` (so the user edits real text, not keys).
 */
export async function materializeForEditing(
  schemaType: string,
): Promise<CategorySchema> {
  const kv = await getKv();
  const stored = await kv.get<StoredCategorySchema>(SCHEMA_KEY(schemaType));
  if (stored.value) return toCategorySchema(stored.value);

  const seed = getSchema(schemaType);
  return {
    schemaType: seed.schemaType,
    label: td(seed.label),
    fields: seed.fields.map((f) => ({
      key: f.key,
      type: f.type,
      label: td(f.label),
      ...(f.options ? { options: f.options.map((o) => td(o)) } : {}),
    })),
  };
}

export async function createSchema(
  input: SchemaInput,
): Promise<CategorySchema> {
  const schema = validateSchemaDefinition(input);
  if (isBuiltinSchemaType(schema.schemaType)) {
    throw new SchemaValidationError(
      `'${schema.schemaType}' is a built-in type — edit it instead of creating it`,
    );
  }
  const kv = await getKv();
  const key = SCHEMA_KEY(schema.schemaType);
  const now = Date.now();
  const stored: StoredCategorySchema = {
    ...schema,
    origin: "user",
    createdAt: now,
    updatedAt: now,
  };
  const res = await kv.atomic()
    .check({ key, versionstamp: null })
    .set(key, stored)
    .commit();
  if (!res.ok) {
    throw new SchemaValidationError(
      `Schema '${schema.schemaType}' already exists`,
    );
  }
  return schema;
}

export async function updateSchema(
  schemaType: string,
  input: SchemaInput,
): Promise<CategorySchema> {
  const schema = validateSchemaDefinition(input);
  if (schema.schemaType !== schemaType) {
    throw new SchemaValidationError("A schema's id is immutable");
  }
  const kv = await getKv();
  const key = SCHEMA_KEY(schemaType);
  const existing = await kv.get<StoredCategorySchema>(key);

  let origin: SchemaOrigin;
  let createdAt: number;
  if (existing.value) {
    // Prevent field key renames: any key that existed before must stay the same
    const existingKeys = new Set(existing.value.fields.map((f) => f.key));
    const submittedKeys = new Set(schema.fields.map((f) => f.key));
    for (const key of existingKeys) {
      if (!submittedKeys.has(key)) {
        throw new SchemaValidationError(
          `Field key '${key}' cannot be renamed or removed`,
        );
      }
    }
    origin = existing.value.origin;
    createdAt = existing.value.createdAt;
  } else if (isBuiltinSchemaType(schemaType)) {
    // First edit of a built-in → copy-on-write override.
    origin = "builtin-override";
    createdAt = Date.now();
  } else {
    throw new SchemaValidationError(`Schema '${schemaType}' not found`);
  }

  const stored: StoredCategorySchema = {
    ...schema,
    origin,
    createdAt,
    updatedAt: Date.now(),
  };
  await kv.set(key, stored);
  return schema;
}

async function schemaInUse(schemaType: string): Promise<boolean> {
  const kv = await getKv();
  for await (
    const e of kv.list<{ schemaType?: string }>({ prefix: ["category"] })
  ) {
    const st = typeof e.value.schemaType === "string"
      ? e.value.schemaType
      : GENERIC_TYPE;
    if (st === schemaType) return true;
  }
  return false;
}

export async function deleteSchema(schemaType: string): Promise<void> {
  if (schemaType === GENERIC_TYPE) {
    throw new SchemaValidationError("The generic type cannot be deleted");
  }
  const kv = await getKv();
  const key = SCHEMA_KEY(schemaType);
  const existing = await kv.get<StoredCategorySchema>(key);

  if (!existing.value) {
    if (isBuiltinSchemaType(schemaType)) {
      throw new SchemaValidationError("A built-in type cannot be deleted");
    }
    return; // unknown id — nothing to delete
  }

  // A user-defined schema may only be deleted when no category uses it.
  // A built-in override is always deletable (resolution reverts to the seed).
  if (existing.value.origin === "user" && await schemaInUse(schemaType)) {
    throw new SchemaValidationError(`Schema '${schemaType}' is in use`);
  }
  await kv.delete(key);
}
