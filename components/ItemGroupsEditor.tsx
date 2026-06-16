import { t } from "@/lib/i18n/t.ts";
import type { Group } from "@/lib/inventory/types.ts";
import GroupAutocomplete from "@/islands/GroupAutocomplete.tsx";

/**
 * Item-side group membership UI: the item's current groups as removable chips,
 * plus an "add to group" input with native `<datalist>` autocomplete over
 * existing group names (island-free find-or-create). All forms POST to the item
 * edit handler.
 */
export function ItemGroupsEditor(
  { itemId, groups, allGroupNames, csrfToken }: {
    itemId: string;
    groups: Group[];
    allGroupNames: string[];
    csrfToken: string;
  },
) {
  const action = `/items/${itemId}/edit`;
  return (
    <section class="item-groups">
      <h2>{t("items.groups_label")}</h2>

      {groups.length > 0 && (
        <ul class="group-chips">
          {groups.map((g) => (
            <li key={g.id} class="group-chip">
              <a href={`/groups/${g.id}`}>{g.name}</a>
              <form method="post" action={action} style="display:inline">
                <input type="hidden" name="csrf_token" value={csrfToken} />
                <input type="hidden" name="_action" value="remove_group" />
                <input type="hidden" name="groupId" value={g.id} />
                <button
                  type="submit"
                  class="chip-remove"
                  aria-label={t("items.remove_from_group")}
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form method="post" action={action} class="add-to-group">
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input type="hidden" name="_action" value="add_group" />
        <GroupAutocomplete name="groupName" suggestions={allGroupNames} />
        <button type="submit" class="btn-small">
          {t("items.group_add_button")}
        </button>
      </form>
    </section>
  );
}
