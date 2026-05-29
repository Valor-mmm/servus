import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import {
  createCategory,
  deleteCategory,
  listCategories,
} from "@/lib/inventory/categoryRepo.ts";
import type { Category } from "@/lib/inventory/types.ts";

interface PageProps {
  categories: Category[];
  error: string | null;
}

function CategoriesPage(
  { categories, error, csrfToken }: PageProps & { csrfToken: string },
) {
  return (
    <main class="page">
      <h1>{t("categories.title")}</h1>
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
        <button type="submit">{t("categories.add")}</button>
      </form>

      {categories.length === 0
        ? <p class="empty">{t("categories.empty")}</p>
        : (
          <ul class="item-list">
            {categories.map((cat) => (
              <li key={cat.id} class="item-row">
                <span>{cat.name}</span>
                <form method="post" action="/categories">
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
    const categories = await listCategories();
    return ctx.render(
      <CategoriesPage
        categories={categories}
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
      try {
        await createCategory(name);
        return new Response(null, {
          status: 302,
          headers: { Location: "/categories" },
        });
      } catch {
        error = t("categories.error.duplicate");
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

    const categories = await listCategories();
    return ctx.render(
      <CategoriesPage
        categories={categories}
        error={error}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },
});
