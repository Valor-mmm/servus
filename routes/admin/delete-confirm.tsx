import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { getKv } from "@/lib/kv/client.ts";
import { exportKv } from "@/lib/kv/export.ts";
import { isAdminUser } from "@/lib/auth/adminGuard.ts";

interface PageProps {
  count: number;
  csrfToken: string;
}

function DeleteConfirmPage({ count, csrfToken }: PageProps) {
  return (
    <main class="page">
      <h1>{t("admin.delete_confirm.title")}</h1>

      <p class="error" role="alert">
        {t("admin.delete_confirm.warning")}
      </p>
      <p>
        <strong>
          {t("admin.delete_confirm.count", { count: String(count) })}
        </strong>
      </p>

      <div class="actions">
        <form method="post" action="/admin/delete">
          <input type="hidden" name="csrf_token" value={csrfToken} />
          <button type="submit" class="btn-danger">
            {t("admin.delete_confirm.button")}
          </button>
        </form>
        <a href="/admin" class="btn-secondary">
          {t("admin.delete_confirm.cancel")}
        </a>
      </div>
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    if (!isAdminUser(ctx.state.user?.username ?? "")) {
      return new Response(null, { status: 403 });
    }
    const kv = await getKv();
    let count = 0;
    for await (const _line of exportKv(kv)) {
      count++;
    }
    return ctx.render(
      <DeleteConfirmPage count={count} csrfToken={ctx.state.csrfToken ?? ""} />,
    );
  },
});
