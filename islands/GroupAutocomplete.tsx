import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";

interface Props {
  /** Form field name the typed value is submitted under. */
  name: string;
  /** Existing group names to suggest. */
  suggestions: string[];
  initialValue?: string;
}

/**
 * A text input with a filtered suggestion dropdown — a reliable replacement for
 * the native `<datalist>`, which does not render its popup on several mobile
 * browsers. Typing filters the existing group names (case-insensitive); tapping
 * one fills the field. The input still submits as part of the surrounding form.
 */
export default function GroupAutocomplete(
  { name, suggestions, initialValue = "" }: Props,
) {
  const value = useSignal(initialValue);
  const open = useSignal(false);

  const query = value.value.trim().toLowerCase();
  const matches = suggestions
    .filter((s) => s.toLowerCase().includes(query))
    .filter((s) => s.toLowerCase() !== query) // hide an exact match
    .slice(0, 8);

  function pick(s: string) {
    value.value = s;
    open.value = false;
  }

  return (
    <div class="autocomplete">
      <input
        type="text"
        name={name}
        value={value.value}
        placeholder={t("items.add_to_group_placeholder")}
        autocomplete="off"
        onInput={(e) => {
          value.value = (e.target as HTMLInputElement).value;
          open.value = true;
        }}
        onFocus={() => (open.value = true)}
        onBlur={() => setTimeout(() => (open.value = false), 120)}
      />
      {open.value && matches.length > 0 && (
        <ul class="autocomplete-list">
          {matches.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
