import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";

interface PageProps {
  imported: number | null;
  skipped: number | null;
  deleted: number | null;
  error: string | null;
  csrfToken: string;
}

function AdminPage(
  { imported, skipped, deleted, error, csrfToken }: PageProps,
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
    </main>
  );
}

export const handler = define.handlers({
  GET(ctx) {
    const url = new URL(ctx.req.url);
    const imported = url.searchParams.get("imported");
    const skipped = url.searchParams.get("skipped");
    const deleted = url.searchParams.get("deleted");
    const error = url.searchParams.get("error");

    return ctx.render(
      <AdminPage
        imported={imported !== null ? Number(imported) : null}
        skipped={skipped !== null ? Number(skipped) : null}
        deleted={deleted !== null ? Number(deleted) : null}
        error={error}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },
});
