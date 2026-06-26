import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { SchemaEditorForm } from "@/components/SchemaEditorForm.tsx";
import {
  deleteSchema,
  listSchemaTypes,
  materializeForEditing,
  schemaTypeExists,
  updateSchema,
} from "@/lib/inventory/schemaRepo.ts";
import { GENERIC_TYPE } from "@/lib/inventory/schemas.ts";
import { readSchemaInputFromForm } from "@/lib/inventory/schemaForm.ts";
import type { CategorySchema } from "@/lib/inventory/types.ts";

function EditSchemaPage(
  { schema, canDelete, csrfToken, error }: {
    schema: CategorySchema;
    canDelete: boolean;
    csrfToken: string;
    error: string | null;
  },
) {
  return (
    <main class="page">
      <h1>{t("schemas.edit_title")}</h1>
      {error && <p class="error">{error}</p>}
      <SchemaEditorForm
        schema={schema}
        action={`/categories/schemas/${schema.schemaType}`}
        csrfToken={csrfToken}
        canDelete={canDelete}
      />
      <p>
        <a href="/categories/schemas" class="btn-secondary">
          {t("action.cancel")}
        </a>
      </p>
    </main>
  );
}

async function canDeleteType(schemaType: string): Promise<boolean> {
  if (schemaType === GENERIC_TYPE) return false;
  const list = await listSchemaTypes();
  // Deletable only when an overlay exists (source "user") — for a pure built-in
  // there is nothing to delete (deleteSchema would reject).
  return list.find((s) => s.schemaType === schemaType)?.source === "user";
}

export const handler = define.handlers({
  async GET(ctx) {
    const type = ctx.params.type;
    if (type === GENERIC_TYPE || !(await schemaTypeExists(type))) {
      return new Response(t("error.not_found"), { status: 404 });
    }
    const [schema, canDelete] = await Promise.all([
      materializeForEditing(type),
      canDeleteType(type),
    ]);
    return ctx.render(
      <EditSchemaPage
        schema={schema}
        canDelete={canDelete}
        csrfToken={ctx.state.csrfToken ?? ""}
        error={null}
      />,
    );
  },

  async POST(ctx) {
    const type = ctx.params.type;
    if (type === GENERIC_TYPE || !(await schemaTypeExists(type))) {
      return new Response(t("error.not_found"), { status: 404 });
    }
    const form = await ctx.req.formData();
    const action = (form.get("_action") as string | null) ?? "save";

    const renderError = async (error: string) =>
      ctx.render(
        <EditSchemaPage
          schema={await materializeForEditing(type)}
          canDelete={await canDeleteType(type)}
          csrfToken={ctx.state.csrfToken ?? ""}
          error={error}
        />,
      );

    if (action === "delete") {
      try {
        await deleteSchema(type);
        return new Response(null, {
          status: 302,
          headers: { Location: "/categories/schemas" },
        });
      } catch {
        return renderError(t("schemas.error.in_use"));
      }
    }

    const input = readSchemaInputFromForm(form, type);
    try {
      await updateSchema(type, input);
      return new Response(null, {
        status: 302,
        headers: { Location: "/categories/schemas" },
      });
    } catch {
      return renderError(t("schemas.error.invalid"));
    }
  },
});
