import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { listOutstandingInvites, mintInvite } from "@/lib/invites/index.ts";
import { generateQrSvg } from "@/lib/invites/qr.ts";
import type { Invite } from "@/lib/invites/types.ts";
import { requireAdmin } from "@/lib/auth/middleware.ts";

interface PageProps {
  imported: number | null;
  skipped: number | null;
  deleted: number | null;
  error: string | null;
  csrfToken: string;
  invites: Invite[];
  newInviteUrl: string | null;
  qrSvg: string | null;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function AdminPage(
  {
    imported,
    skipped,
    deleted,
    error,
    csrfToken,
    invites,
    newInviteUrl,
    qrSvg,
  }: PageProps,
) {
  return (
    <main class="page">
      <h1>{t("admin.title")}</h1>

      {imported !== null && (
        <p class="success" role="status">
          {t("admin.import.success", {
            imported: String(imported),
            skipped: String(skipped ?? 0),
          })}
        </p>
      )}
      {deleted !== null && (
        <p class="success" role="status">
          {t("admin.delete.success", { deleted: String(deleted) })}
        </p>
      )}
      {error && (
        <p class="error" role="alert">
          {t("admin.import.error", { message: error })}
        </p>
      )}

      <section class="admin-section">
        <h2>{t("admin.export.heading")}</h2>
        <p>{t("admin.export.description")}</p>
        <a href="/admin/export" class="btn-primary">
          {t("admin.export.button")}
        </a>
      </section>

      <section class="admin-section">
        <h2>{t("admin.import.heading")}</h2>
        <p>{t("admin.import.description")}</p>
        <form
          method="post"
          action="/admin/import"
          enctype="multipart/form-data"
        >
          <input type="hidden" name="csrf_token" value={csrfToken} />
          <label>
            {t("admin.import.file_label")}
            <input
              type="file"
              name="file"
              accept=".ndjson,application/x-ndjson"
              required
            />
          </label>
          <button type="submit" class="btn-primary">
            {t("admin.import.button")}
          </button>
        </form>
      </section>

      <section class="admin-section admin-section-danger">
        <h2>{t("admin.delete.heading")}</h2>
        <p>{t("admin.delete.description")}</p>
        <a href="/admin/delete-confirm" class="btn-danger">
          {t("admin.delete.button")}
        </a>
      </section>

      <section class="admin-section">
        <h2>{t("invites.title")}</h2>

        {newInviteUrl && (
          <div class="invite-code-banner">
            <p class="invite-warning">{t("invites.code_warning")}</p>
            <p>
              <strong>{t("invites.code_label")}:</strong>
            </p>
            <code class="invite-url">{newInviteUrl}</code>
            {qrSvg && (
              <img
                class="invite-qr"
                src={`data:image/svg+xml;charset=utf-8,${
                  encodeURIComponent(qrSvg)
                }`}
                alt={t("invites.qr_label")}
                width="200"
                height="200"
              />
            )}
          </div>
        )}

        <form method="post" action="/admin">
          <input type="hidden" name="csrf_token" value={csrfToken} />
          <input type="hidden" name="_action" value="create_invite" />
          <label>
            {t("invites.expiry_label")}
            <input
              type="number"
              name="expiry_days"
              min="1"
              max="30"
              value={t("invites.expiry_default")}
              required
            />
          </label>
          <button type="submit">{t("invites.create")}</button>
        </form>

        {invites.length === 0
          ? <p class="empty">{t("invites.empty")}</p>
          : (
            <ul class="item-list">
              {invites.map((inv) => (
                <li key={inv.id} class="item-row">
                  <span>
                    {t("invites.created_at_label")}: {formatDate(inv.createdAt)}
                    {" — "}
                    {t("invites.expiry_date_label")}: {formatDate(inv.expiry)}
                  </span>
                  <form
                    method="post"
                    action={`/admin/invites/${inv.id}/revoke`}
                  >
                    <input type="hidden" name="csrf_token" value={csrfToken} />
                    <button type="submit" class="btn-danger btn-small">
                      {t("invites.revoke")}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
      </section>
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const guard = await requireAdmin(ctx);
    if (guard) return guard;
    const url = new URL(ctx.req.url);
    const imported = url.searchParams.get("imported");
    const skipped = url.searchParams.get("skipped");
    const deleted = url.searchParams.get("deleted");
    const error = url.searchParams.get("error");
    const invites = await listOutstandingInvites();

    return ctx.render(
      <AdminPage
        imported={imported !== null ? Number(imported) : null}
        skipped={skipped !== null ? Number(skipped) : null}
        deleted={deleted !== null ? Number(deleted) : null}
        error={error}
        csrfToken={ctx.state.csrfToken ?? ""}
        invites={invites}
        newInviteUrl={null}
        qrSvg={null}
      />,
    );
  },

  async POST(ctx) {
    const guard = await requireAdmin(ctx);
    if (guard) return guard;
    const form = await ctx.req.formData();
    const action = form.get("_action") as string;

    if (action === "create_invite") {
      const expiryDaysRaw = (form.get("expiry_days") as string | null) ?? "7";
      const expiryDays = Math.max(
        1,
        Math.min(30, parseInt(expiryDaysRaw, 10) || 7),
      );

      const { rawCode } = await mintInvite(expiryDays);
      const origin = new URL(ctx.req.url).origin;
      const newInviteUrl = `${origin}/invite/${rawCode}`;
      const qrSvg = await generateQrSvg(newInviteUrl);
      const invites = await listOutstandingInvites();

      return ctx.render(
        <AdminPage
          imported={null}
          skipped={null}
          deleted={null}
          error={null}
          csrfToken={ctx.state.csrfToken ?? ""}
          invites={invites}
          newInviteUrl={newInviteUrl}
          qrSvg={qrSvg}
        />,
      );
    }

    return new Response(null, { status: 302, headers: { Location: "/admin" } });
  },
});
