import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import {
  deleteGroup,
  findGroup,
  listMembers,
  renameGroup,
  reorderMembers,
} from "@/lib/inventory/groupRepo.ts";
import type { Group, Item } from "@/lib/inventory/types.ts";
import GroupReorder from "@/islands/GroupReorder.tsx";

function GroupDetailPage(
  { group, members, error, csrfToken }: {
    group: Group;
    members: Item[];
    error: string | null;
    csrfToken: string;
  },
) {
  return (
    <main class="page">
      <h1>{t("groups.detail_title")}: {group.name}</h1>
      {error && <p class="error">{error}</p>}

      <form method="post" action={`/groups/${group.id}`} class="rename-form">
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input type="hidden" name="_action" value="rename" />
        <label>
          {t("groups.name_label")}
          <input type="text" name="name" value={group.name} required />
        </label>
        <button type="submit" class="btn-small">{t("groups.rename")}</button>
      </form>

      <h2>{t("groups.members_heading")}</h2>
      <GroupReorder
        groupId={group.id}
        members={members.map((m) => ({ id: m.id, name: m.name || "–" }))}
        csrfToken={csrfToken}
      />

      <div class="actions">
        <a href="/groups" class="btn-secondary">{t("action.back")}</a>
        <form
          method="post"
          action={`/groups/${group.id}`}
          style="display:inline"
        >
          <input type="hidden" name="csrf_token" value={csrfToken} />
          <input type="hidden" name="_action" value="delete" />
          <button type="submit" class="btn-danger">{t("groups.delete")}</button>
        </form>
      </div>
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const group = await findGroup(ctx.params.id);
    if (!group) return new Response(t("error.not_found"), { status: 404 });
    const members = await listMembers(group.id);
    return ctx.render(
      <GroupDetailPage
        group={group}
        members={members}
        error={null}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const group = await findGroup(ctx.params.id);
    if (!group) return new Response(t("error.not_found"), { status: 404 });

    const form = await ctx.req.formData();
    const action = (form.get("_action") as string | null) ?? "";

    if (action === "delete") {
      await deleteGroup(group.id);
      return new Response(null, {
        status: 302,
        headers: { Location: "/groups" },
      });
    }

    if (action === "reorder") {
      const order = ((form.get("order") as string | null) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
      await reorderMembers(group.id, order);
      return new Response(null, {
        status: 302,
        headers: { Location: `/groups/${group.id}` },
      });
    }

    if (action === "rename") {
      const name = ((form.get("name") as string | null) ?? "").trim();
      try {
        await renameGroup(group.id, name);
        return new Response(null, {
          status: 302,
          headers: { Location: `/groups/${group.id}` },
        });
      } catch {
        return ctx.render(
          <GroupDetailPage
            group={group}
            members={await listMembers(group.id)}
            error={t("groups.error.duplicate")}
            csrfToken={ctx.state.csrfToken ?? ""}
          />,
        );
      }
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `/groups/${group.id}` },
    });
  },
});
