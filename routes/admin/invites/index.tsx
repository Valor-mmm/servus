import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { listOutstandingInvites, mintInvite } from "@/lib/invites/index.ts";
import { generateQrSvg } from "@/lib/invites/qr.ts";
import type { Invite } from "@/lib/invites/types.ts";

interface PageProps {
  invites: Invite[];
  newCode: string | null;
  inviteUrl: string | null;
  qrSvg: string | null;
  error: string | null;
  csrfToken: string;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function AdminInvitesPage(
  { invites, newCode, inviteUrl, qrSvg, error, csrfToken }: PageProps,
) {
  return (
    <main class="page">
      <h1>{t("invites.title")}</h1>

      {newCode && inviteUrl && (
        <div class="invite-code-banner">
          <p class="invite-warning">{t("invites.code_warning")}</p>
          <p>
            <strong>{t("invites.code_label")}:</strong>
          </p>
          <code class="invite-url">{inviteUrl}</code>
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

      {error && <p class="error">{error}</p>}

      <form method="post" action="/admin/invites">
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input type="hidden" name="_action" value="create" />
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
                  <button type="submit" class="btn-danger">
                    {t("invites.revoke")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const invites = await listOutstandingInvites();
    return ctx.render(
      <AdminInvitesPage
        invites={invites}
        newCode={null}
        inviteUrl={null}
        qrSvg={null}
        error={null}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const action = form.get("_action") as string;

    if (action === "create") {
      const expiryDaysRaw = (form.get("expiry_days") as string | null) ?? "7";
      const expiryDays = Math.max(
        1,
        Math.min(30, parseInt(expiryDaysRaw, 10) || 7),
      );

      const { rawCode, invite: _invite } = await mintInvite(expiryDays);
      const origin = new URL(ctx.req.url).origin;
      const inviteUrl = `${origin}/invite/${rawCode}`;
      const qrSvg = await generateQrSvg(inviteUrl);

      const invites = await listOutstandingInvites();
      return ctx.render(
        <AdminInvitesPage
          invites={invites}
          newCode={rawCode}
          inviteUrl={inviteUrl}
          qrSvg={qrSvg}
          error={null}
          csrfToken={ctx.state.csrfToken ?? ""}
        />,
      );
    }

    const invites = await listOutstandingInvites();
    return ctx.render(
      <AdminInvitesPage
        invites={invites}
        newCode={null}
        inviteUrl={null}
        qrSvg={null}
        error={null}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },
});
