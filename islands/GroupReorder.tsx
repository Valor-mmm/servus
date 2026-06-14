import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";

interface Member {
  id: string;
  name: string;
}

interface Props {
  groupId: string;
  members: Member[];
  csrfToken: string;
}

/**
 * Reorder a group's members. Move up/down buttons reorder instantly client-side
 * (reliable on touch and desktop); "Reihenfolge speichern" submits the new order
 * to the group handler. The list is server-rendered, so it still shows the
 * persisted order without JavaScript — only reordering needs JS.
 */
export default function GroupReorder(
  { groupId, members, csrfToken }: Props,
) {
  const order = useSignal<Member[]>(members);

  function move(index: number, delta: -1 | 1) {
    const next = [...order.value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    order.value = next;
  }

  if (members.length === 0) {
    return <p class="empty">{t("groups.no_members")}</p>;
  }

  return (
    <form method="post" action={`/groups/${groupId}`} class="group-reorder">
      <input type="hidden" name="csrf_token" value={csrfToken} />
      <input type="hidden" name="_action" value="reorder" />
      <input
        type="hidden"
        name="order"
        value={order.value.map((m) =>
          m.id
        ).join(",")}
      />

      <p class="hint">{t("groups.reorder_hint")}</p>
      <ul class="group-members">
        {order.value.map((m, i) => (
          <li key={m.id} class="item-row">
            <a href={`/items/${m.id}`}>{m.name}</a>
            <span class="reorder-controls">
              <button
                type="button"
                class="btn-small"
                aria-label="↑"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                class="btn-small"
                aria-label="↓"
                disabled={i === order.value.length - 1}
                onClick={() =>
                  move(i, 1)}
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ul>

      <button type="submit" class="btn-primary">
        {t("groups.save_order")}
      </button>
    </form>
  );
}
