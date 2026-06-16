import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";
import { SchemaFields } from "@/components/SchemaFields.tsx";
import type { CategorySchema } from "@/lib/inventory/types.ts";

interface Props {
  categories: { id: string; name: string }[];
  /** Resolved schema per category id (pre-resolved on the server). */
  schemas: Record<string, CategorySchema>;
  initialCategoryId?: string;
}

/**
 * Category select plus the selected category's typed fields, rendered live: when
 * the category changes the schema fields update immediately, without saving. The
 * field inputs (`meta.*`) submit with the surrounding form. Used on the new-item
 * page so creators see typed fields right away.
 */
export default function ItemCategoryFields(
  { categories, schemas, initialCategoryId = "" }: Props,
) {
  const selected = useSignal(initialCategoryId);
  const schema: CategorySchema | undefined = schemas[selected.value];

  return (
    <>
      <label>
        {t("items.category_label")}
        <select
          name="categoryId"
          required
          value={selected.value}
          onChange={(e) =>
            selected.value = (e.target as HTMLSelectElement).value}
        >
          <option value="">– {t("items.category_label")} –</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      {schema && <SchemaFields schema={schema} metadata={{}} />}
    </>
  );
}
