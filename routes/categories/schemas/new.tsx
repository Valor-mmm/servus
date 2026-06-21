import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { SchemaEditorForm } from "@/components/SchemaEditorForm.tsx";
import { createSchema } from "@/lib/inventory/schemaRepo.ts";
import {
  readSchemaInputFromForm,
  slugifySchemaType,
} from "@/lib/inventory/schemaForm.ts";

const ACTION = "/categories/schemas/new";

function NewSchemaPage(
  { csrfToken, error }: { csrfToken: string; error: string | null },
) {
  return (
    <main class="page">
      <h1>{t("schemas.new_title")}</h1>
      {error && <p class="error">{error}</p>}
      <SchemaEditorForm schema={null} action={ACTION} csrfToken={csrfToken} />
      <p>
        <a href="/categories/schemas" class="btn-secondary">
          {t("action.cancel")}
        </a>
      </p>
    </main>
  );
}

export const handler = define.handlers({
  GET(ctx) {
    return ctx.render(
      <NewSchemaPage csrfToken={ctx.state.csrfToken ?? ""} error={null} />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const name = ((form.get("name") as string | null) ?? "").trim();
    const schemaType = slugifySchemaType(name);
    const input = readSchemaInputFromForm(form, schemaType);

    try {
      await createSchema(input);
      return new Response(null, {
        status: 302,
        headers: { Location: "/categories/schemas" },
      });
    } catch {
      return ctx.render(
        <NewSchemaPage
          csrfToken={ctx.state.csrfToken ?? ""}
          error={t("schemas.error.invalid")}
        />,
      );
    }
  },
});
