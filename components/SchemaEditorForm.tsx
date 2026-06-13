import { t } from "@/lib/i18n/t.ts";
import type { CategorySchema, FieldType } from "@/lib/inventory/types.ts";

const FIELD_TYPES: FieldType[] = ["text", "number", "enum", "date", "boolean"];

const TYPE_LABEL = {
  text: "schemas.fieldtype.text",
  number: "schemas.fieldtype.number",
  enum: "schemas.fieldtype.enum",
  date: "schemas.fieldtype.date",
  boolean: "schemas.fieldtype.boolean",
} as const satisfies Record<FieldType, string>;

function FieldRow(
  { index, label, type, options, fieldKey }: {
    index: number;
    label: string;
    type: FieldType;
    options: string[];
    fieldKey: string;
  },
) {
  return (
    <fieldset class="schema-field-row">
      {fieldKey && (
        <input type="hidden" name={`field_key_${index}`} value={fieldKey} />
      )}
      <label>
        {t("schemas.field_label")}
        <input
          type="text"
          name={`field_label_${index}`}
          value={label}
          placeholder={t("schemas.field_label_placeholder")}
        />
      </label>
      <label>
        {t("schemas.field_type")}
        <select name={`field_type_${index}`}>
          {FIELD_TYPES.map((ft) => (
            <option key={ft} value={ft} selected={ft === type}>
              {t(TYPE_LABEL[ft])}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("schemas.field_options")}
        <textarea name={`field_options_${index}`} rows={3}>
          {options.join("\n")}
        </textarea>
      </label>
    </fieldset>
  );
}

/**
 * Create/edit form for a category schema. Renders the existing fields followed
 * by a few blank rows (island-free "add field"); empty rows are dropped on
 * submit. For built-ins, the id is fixed and deletion is hidden.
 */
export function SchemaEditorForm(
  { schema, action, csrfToken, spareRows = 5, canDelete = false }: {
    schema: CategorySchema | null;
    action: string;
    csrfToken: string;
    spareRows?: number;
    canDelete?: boolean;
  },
) {
  const existing = schema?.fields ?? [];
  const total = existing.length + spareRows;

  return (
    <>
      <form method="post" action={action}>
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input type="hidden" name="_action" value="save" />

        <label>
          {t("schemas.name_label")}
          <input
            type="text"
            name="name"
            value={schema?.label ?? ""}
            placeholder={t("schemas.name_placeholder")}
            required
          />
        </label>

        <h2>{t("schemas.fields_heading")}</h2>
        {Array.from({ length: total }, (_, i) => {
          const f = existing[i];
          return (
            <FieldRow
              key={i}
              index={i}
              label={f?.label ?? ""}
              type={(f?.type ?? "text") as FieldType}
              options={f?.options ?? []}
              fieldKey={f?.key ?? ""}
            />
          );
        })}

        <button type="submit">{t("schemas.save")}</button>
      </form>

      {canDelete && schema && (
        <form
          method="post"
          action={action}
          data-confirm={t("schemas.delete_confirm", { name: schema.label })}
        >
          <input type="hidden" name="csrf_token" value={csrfToken} />
          <input type="hidden" name="_action" value="delete" />
          <button type="submit" class="btn-danger">
            {t("schemas.delete")}
          </button>
        </form>
      )}
    </>
  );
}
