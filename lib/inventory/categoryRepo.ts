import { getKv } from "@/lib/kv/client.ts";
import type { Category } from "@/lib/inventory/types.ts";
import { schemaTypeExists } from "@/lib/inventory/schemaRepo.ts";

const CAT_KEY = (id: string): Deno.KvKey => ["category", id];
const CAT_BY_NAME_KEY = (name: string): Deno.KvKey => [
  "category-by-name",
  name.toLowerCase(),
];
const CAT_INDEX_PREFIX = (id: string): Deno.KvKey => ["item-by-category", id];

// deno-lint-ignore no-explicit-any
function normalizeCategory(raw: any): Category {
  return {
    ...raw,
    schemaType: typeof raw.schemaType === "string" ? raw.schemaType : "generic",
    canContain: typeof raw.canContain === "boolean" ? raw.canContain : false,
  };
}

export async function createCategory(
  name: string,
  schemaType: string = "generic",
  canContain: boolean = false,
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
  const category: Category = {
    id,
    name,
    schemaType,
    canContain,
    createdAt: Date.now(),
  };

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
  canContain?: boolean;
}

async function categoryHasOccupiedContainers(
  kv: Deno.Kv,
  categoryId: string,
): Promise<boolean> {
  // Walk all items in this category and check if any have items inside them.
  for await (
    const entry of kv.list<true>({ prefix: ["item-by-category", categoryId] })
  ) {
    const itemId = entry.key[2] as string;
    const containerIndex = kv.list({ prefix: ["item-by-container", itemId] });
    const first = await containerIndex.next();
    if (!first.done) return true;
  }
  return false;
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

  // Guard: cannot disable canContain while any item in this category has contents
  if (input.canContain === false && existing.canContain === true) {
    if (await categoryHasOccupiedContainers(kv, id)) {
      throw new Error(
        `Category '${id}' has occupied containers — empty them before disabling canContain`,
      );
    }
  }

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
    canContain: input.canContain !== undefined
      ? input.canContain
      : existing.canContain,
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
