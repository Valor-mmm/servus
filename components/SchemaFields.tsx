import { td } from "@/lib/i18n/t.ts";
import type { CategorySchema, FieldDef } from "@/lib/inventory/types.ts";

// Form field name prefix so schema values never clash with core item fields.
export const META_PREFIX = "meta.";

function valueToString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

function FieldControl(
  { field, value }: { field: FieldDef; value: unknown },
) {
  const name = META_PREFIX + field.key;
  switch (field.type) {
    case "number":
      return (
        <input
          type="number"
          name={name}
          step="any"
          value={valueToString(value)}
        />
      );
    case "date":
      return <input type="date" name={name} value={valueToString(value)} />;
    case "boolean":
      return (
        <input
          type="checkbox"
          name={name}
          value="true"
          checked={value === true}
        />
      );
    case "enum":
      return (
        <select name={name}>
          <option value="">–</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt} selected={value === opt}>
              {td(opt)}
            </option>
          ))}
        </select>
      );
    case "text":
    default:
      return <input type="text" name={name} value={valueToString(value)} />;
  }
}

/**
 * Renders the editable controls for a category schema's fields, in definition
 * order, pre-filled from the item's metadata. Renders nothing for the generic
 * (empty) schema.
 */
export function SchemaFields(
  { schema, metadata }: {
    schema: CategorySchema;
    metadata: Record<string, unknown>;
  },
) {
  if (schema.fields.length === 0) return null;
  return (
    <fieldset class="schema-fields">
      {schema.fields.map((field) => (
        <label key={field.key}>
          {td(field.label)}
          <FieldControl field={field} value={metadata[field.key]} />
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Read-only display of a schema's populated fields for the item detail page.
 * Skips fields with no stored value.
 */
export function SchemaFieldsDisplay(
  { schema, metadata }: {
    schema: CategorySchema;
    metadata: Record<string, unknown>;
  },
) {
  const present = schema.fields.filter((f) =>
    metadata[f.key] !== undefined && metadata[f.key] !== ""
  );
  if (present.length === 0) return null;
  return (
    <>
      {present.map((field) => {
        const raw = metadata[field.key];
        let display: string;
        if (field.type === "boolean") {
          display = raw ? "✓" : "–";
        } else if (field.type === "enum") {
          display = td(String(raw));
        } else {
          display = String(raw);
        }
        return (
          <>
            <dt key={`${field.key}-dt`}>{td(field.label)}</dt>
            <dd key={`${field.key}-dd`}>{display}</dd>
          </>
        );
      })}
    </>
  );
}

/**
 * Extracts and shapes raw `meta.*` values out of submitted form data into a
 * plain record keyed by field key. Validation happens downstream in the repo.
 */
export function readMetadataFromForm(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith(META_PREFIX)) {
      out[key.slice(META_PREFIX.length)] = value;
    }
  }
  return out;
}
