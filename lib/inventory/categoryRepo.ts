import { getKv } from "@/lib/kv/client.ts";
import type { Category } from "@/lib/inventory/types.ts";
import { schemaTypeExists } from "@/lib/inventory/schemaRepo.ts";

const CAT_KEY = (id: string): Deno.KvKey => ["category", id];
const CAT_BY_NAME_KEY = (name: string): Deno.KvKey => [
  "category-by-name",
  name.toLowerCase(),
];
const CAT_INDEX_PREFIX = (id: string): Deno.KvKey => ["item-by-category", id];

// Legacy records predate `schemaType`; default them to generic on read. No
// write-side migration needed — see design.md "Backward compatibility".
// deno-lint-ignore no-explicit-any
function normalizeCategory(raw: any): Category {
  return {
    ...raw,
    schemaType: typeof raw.schemaType === "string" ? raw.schemaType : "generic",
  };
}

export async function createCategory(
  name: string,
  schemaType: string = "generic",
): Promise<Category> {
  if (!(await schemaTypeExists(schemaType))) {
    throw new Error(`Unknown schemaType '${schemaType}'`);
  }
  const kv = await getKv();
  const normalized = name.toLowerCase();
  const nameKey = CAT_BY_NAME_KEY(name);

  const existing = await kv.get(nameKey);
  if (existing.value !== null) {
    throw new Error(`Category '${name}' already exists`);
  }

  const id = crypto.randomUUID();
  const category: Category = { id, name, schemaType, createdAt: Date.now() };

  const result = await kv.atomic()
    .check({ key: nameKey, versionstamp: null })
    .set(CAT_KEY(id), category)
    .set(nameKey, id)
    .commit();

  if (!result.ok) {
    throw new Error(`Category '${normalized}' already exists`);
  }

  return category;
}

export async function findCategory(id: string): Promise<Category | null> {
  const kv = await getKv();
  const entry = await kv.get<Category>(CAT_KEY(id));
  return entry.value ? normalizeCategory(entry.value) : null;
}

export async function listCategories(): Promise<Category[]> {
  const kv = await getKv();
  const entries = kv.list<Category>({ prefix: ["category"] });
  const results: Category[] = [];
  for await (const entry of entries) {
    results.push(normalizeCategory(entry.value));
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export interface UpdateCategoryInput {
  name?: string;
  schemaType?: string;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  const existing = await findCategory(id);
  if (!existing) throw new Error(`Category '${id}' not found`);

  if (
    input.schemaType !== undefined &&
    !(await schemaTypeExists(input.schemaType))
  ) {
    throw new Error(`Unknown schemaType '${input.schemaType}'`);
  }

  const kv = await getKv();
  const newName = input.name?.trim() ? input.name.trim() : existing.name;
  const renamed = newName.toLowerCase() !== existing.name.toLowerCase();

  if (renamed) {
    const clash = await kv.get(CAT_BY_NAME_KEY(newName));
    if (clash.value !== null) {
      throw new Error(`Category '${newName}' already exists`);
    }
  }

  const updated: Category = {
    ...existing,
    name: newName,
    schemaType: input.schemaType ?? existing.schemaType,
  };

  const op = kv.atomic().set(CAT_KEY(id), updated);
  if (renamed) {
    op.check({ key: CAT_BY_NAME_KEY(newName), versionstamp: null })
      .delete(CAT_BY_NAME_KEY(existing.name))
      .set(CAT_BY_NAME_KEY(newName), id);
  }
  const result = await op.commit();
  if (!result.ok) throw new Error(`Category '${newName}' already exists`);

  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  const kv = await getKv();

  const inUse = kv.list({ prefix: CAT_INDEX_PREFIX(id) });
  const first = await inUse.next();
  if (!first.done) {
    throw new Error(`Category '${id}' is in use`);
  }

  const category = await findCategory(id);
  if (!category) return;

  await kv.atomic()
    .delete(CAT_KEY(id))
    .delete(CAT_BY_NAME_KEY(category.name))
    .commit();
}
