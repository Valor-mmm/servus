import { define } from "@/utils.ts";
import { t, td } from "@/lib/i18n/t.ts";
import { EmptyState } from "@/components/EmptyState.tsx";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/lib/inventory/categoryRepo.ts";
import {
  listSchemaTypes,
  type SchemaTypeListing,
} from "@/lib/inventory/schemaRepo.ts";
import type { Category } from "@/lib/inventory/types.ts";

interface PageProps {
  categories: Category[];
  schemaTypes: SchemaTypeListing[];
  error: string | null;
}

function SchemaSelect(
  { name, selected, types }: {
    name: string;
    selected: string;
    types: SchemaTypeListing[];
  },
) {
  return (
    <select name={name}>
      {types.map((s) => (
        <option
          key={s.schemaType}
          value={s.schemaType}
          selected={s.schemaType === selected}
        >
          {td(s.label)}
        </option>
      ))}
    </select>
  );
}

function CategoriesPage(
  { categories, schemaTypes, error, csrfToken }:
    & PageProps
    & { csrfToken: string },
) {
  return (
    <main class="page">
      <div class="page-header">
        <h1>{t("categories.title")}</h1>
        <a href="/categories/schemas" class="btn-secondary">
          {t("categories.manage_schemas")}
        </a>
      </div>
      {error && <p class="error">{error}</p>}

      <form method="post" action="/categories">
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input type="hidden" name="_action" value="create" />
        <label>
          {t("categories.name_label")}
          <input
            type="text"
            name="name"
            placeholder={t("categories.name_placeholder")}
            required
          />
        </label>
        <label>
          {t("categories.schema_label")}
          <SchemaSelect
            name="schemaType"
            selected="generic"
            types={schemaTypes}
          />
        </label>
        <label class="checkbox-label">
          <input type="checkbox" name="canContain" value="1" />
          {t("categories.can_contain_label")}
        </label>
        <button type="submit">{t("categories.add")}</button>
      </form>

      {categories.length === 0
        ? <EmptyState message={t("categories.empty")} />
        : (
          <ul class="item-list category-list">
            {categories.map((cat) => (
              <li key={cat.id} class="item-row">
                <span>{cat.name}</span>
                <form method="post" action="/categories">
                  <input type="hidden" name="csrf_token" value={csrfToken} />
                  <input type="hidden" name="_action" value="update" />
                  <input type="hidden" name="id" value={cat.id} />
                  <label>
                    {t("categories.schema_label")}
                    <SchemaSelect
                      name="schemaType"
                      selected={cat.schemaType}
                      types={schemaTypes}
                    />
                  </label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      name="canContain"
                      value="1"
                      checked={cat.canContain}
                    />
                    {t("categories.can_contain_label")}
                  </label>
                  <button type="submit" class="btn-small">
                    {t("categories.save")}
                  </button>
                </form>
                <form
                  method="post"
                  action="/categories"
                  data-confirm={t("categories.delete_confirm", {
                    name: cat.name,
                  })}
                >
                  <input type="hidden" name="csrf_token" value={csrfToken} />
                  <input type="hidden" name="_action" value="delete" />
                  <input type="hidden" name="id" value={cat.id} />
                  <button type="submit" class="btn-danger">
                    {t("action.delete")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const [categories, schemaTypes] = await Promise.all([
      listCategories(),
      listSchemaTypes(),
    ]);
    return ctx.render(
      <CategoriesPage
        categories={categories}
        schemaTypes={schemaTypes}
        error={null}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const action = form.get("_action") as string;
    let error: string | null = null;

    if (action === "create") {
      const name = ((form.get("name") as string | null) ?? "").trim();
      const schemaType = (form.get("schemaType") as string | null) ?? "generic";
      const canContain = form.get("canContain") === "1";
      try {
        await createCategory(name, schemaType, canContain);
        return new Response(null, {
          status: 302,
          headers: { Location: "/categories" },
        });
      } catch (e) {
        error = (e instanceof Error && e.message.includes("schemaType"))
          ? t("categories.error.invalid_schema")
          : t("categories.error.duplicate");
      }
    } else if (action === "update") {
      const id = (form.get("id") as string | null) ?? "";
      const schemaType = (form.get("schemaType") as string | null) ?? "generic";
      const canContain = form.get("canContain") === "1";
      try {
        await updateCategory(id, { schemaType, canContain });
        return new Response(null, {
          status: 302,
          headers: { Location: "/categories" },
        });
      } catch (e) {
        error = e instanceof Error && e.message.includes("occupied")
          ? t("categories.error.occupied_containers")
          : (e instanceof Error && e.message.includes("schemaType"))
          ? t("categories.error.invalid_schema")
          : t("categories.error.duplicate");
      }
    } else if (action === "delete") {
      const id = (form.get("id") as string | null) ?? "";
      try {
        await deleteCategory(id);
        return new Response(null, {
          status: 302,
          headers: { Location: "/categories" },
        });
      } catch {
        error = t("categories.error.in_use");
      }
    }

    const [categories, schemaTypes] = await Promise.all([
      listCategories(),
      listSchemaTypes(),
    ]);
    return ctx.render(
      <CategoriesPage
        categories={categories}
        schemaTypes={schemaTypes}
        error={error}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },
});
