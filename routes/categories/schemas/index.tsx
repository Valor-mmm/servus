import { define } from "@/utils.ts";
import { t, td } from "@/lib/i18n/t.ts";
import {
  listSchemaTypes,
  type SchemaTypeListing,
} from "@/lib/inventory/schemaRepo.ts";

function SchemasPage(
  { schemaTypes }: { schemaTypes: SchemaTypeListing[] },
) {
  return (
    <main class="page">
      <div class="page-header">
        <h1>{t("schemas.title")}</h1>
        <a href="/categories/schemas/new" class="btn-primary">
          {t("schemas.new")}
        </a>
      </div>
      <p class="hint">{t("schemas.builtin_note")}</p>

      <ul class="item-list">
        {schemaTypes.map((s) => (
          <li key={s.schemaType} class="item-row">
            <a href={`/categories/schemas/${s.schemaType}`}>{td(s.label)}</a>
            {s.source === "builtin" && (
              <span class="badge">{t("schemas.builtin_badge")}</span>
            )}
          </li>
        ))}
      </ul>

      <p>
        <a href="/categories" class="btn-secondary">{t("action.back")}</a>
      </p>
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const schemaTypes = await listSchemaTypes();
    return ctx.render(<SchemasPage schemaTypes={schemaTypes} />);
  },
});
