import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { EmptyState } from "@/components/EmptyState.tsx";
import {
  countMembers,
  createGroup,
  listGroups,
} from "@/lib/inventory/groupRepo.ts";
import type { Group } from "@/lib/inventory/types.ts";

interface Row {
  group: Group;
  count: number;
}

function GroupsPage(
  { rows, error, csrfToken }: {
    rows: Row[];
    error: string | null;
    csrfToken: string;
  },
) {
  return (
    <main class="page">
      <h1>{t("groups.title")}</h1>
      {error && <p class="error">{error}</p>}

      <form method="post" action="/groups">
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input type="hidden" name="_action" value="create" />
        <label>
          {t("groups.name_label")}
          <input
            type="text"
            name="name"
            placeholder={t("groups.name_placeholder")}
            required
          />
        </label>
        <button type="submit">{t("groups.add")}</button>
      </form>

      {rows.length === 0
        ? <EmptyState message={t("groups.empty")} />
        : (
          <ul class="item-list">
            {rows.map(({ group, count }) => (
              <li key={group.id} class="item-row">
                <a href={`/groups/${group.id}`}>{group.name}</a>
                <span class="meta">
                  {t("groups.member_count", { count: String(count) })}
                </span>
              </li>
            ))}
          </ul>
        )}

      <p>
        <a href="/mehr" class="btn-secondary">{t("action.back")}</a>
      </p>
    </main>
  );
}

async function loadRows(): Promise<Row[]> {
  const groups = await listGroups();
  return Promise.all(
    groups.map(async (group) => ({
      group,
      count: await countMembers(group.id),
    })),
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    return ctx.render(
      <GroupsPage
        rows={await loadRows()}
        error={null}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const action = form.get("_action") as string;

    if (action === "create") {
      const name = ((form.get("name") as string | null) ?? "").trim();
      try {
        const group = await createGroup(name);
        return new Response(null, {
          status: 302,
          headers: { Location: `/groups/${group.id}` },
        });
      } catch {
        return ctx.render(
          <GroupsPage
            rows={await loadRows()}
            error={t("groups.error.duplicate")}
            csrfToken={ctx.state.csrfToken ?? ""}
          />,
        );
      }
    }

    return new Response(null, {
      status: 302,
      headers: { Location: "/groups" },
    });
  },
});
