import { getKv } from "@/lib/kv/client.ts";
import type { Category } from "@/lib/inventory/types.ts";

const CAT_KEY = (id: string): Deno.KvKey => ["category", id];
const CAT_BY_NAME_KEY = (name: string): Deno.KvKey => [
  "category-by-name",
  name.toLowerCase(),
];
const CAT_INDEX_PREFIX = (id: string): Deno.KvKey => ["item-by-category", id];

export async function createCategory(name: string): Promise<Category> {
  const kv = await getKv();
  const normalized = name.toLowerCase();
  const nameKey = CAT_BY_NAME_KEY(name);

  const existing = await kv.get(nameKey);
  if (existing.value !== null) {
    throw new Error(`Category '${name}' already exists`);
  }

  const id = crypto.randomUUID();
  const category: Category = { id, name, createdAt: Date.now() };

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
  return entry.value;
}

export async function listCategories(): Promise<Category[]> {
  const kv = await getKv();
  const entries = kv.list<Category>({ prefix: ["category"] });
  const results: Category[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
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
