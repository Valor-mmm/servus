import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";

/**
 * The "Mehr" secondary menu: secondary destinations, the theme control, and the
 * logout action that no longer fit in the mobile bottom bar. Server-rendered,
 * island-free.
 */
export function MehrMenu({ csrfToken }: { csrfToken: string }) {
  return (
    <main class="page">
      <h1>{t("menu.title")}</h1>

      <ul class="menu-list">
        <li>
          <a href="/categories">
            <span class="nav-icon">🏷️</span>
            {t("nav.categories")}
          </a>
        </li>
        <li>
          <a href="/rooms">
            <span class="nav-icon">🏠</span>
            {t("nav.rooms")}
          </a>
        </li>
        <li>
          <a href="/groups">
            <span class="nav-icon">🔗</span>
            {t("nav.groups")}
          </a>
        </li>
        <li>
          <a href="/admin">
            <span class="nav-icon">🛠️</span>
            {t("admin.nav")}
          </a>
        </li>
        <li>
          <button
            type="button"
            class="theme-toggle menu-item"
            aria-label={t("nav.toggleTheme")}
            data-theme-toggle
          >
            <span class="nav-icon">🎨</span>
            {t("nav.toggleTheme")}
          </button>
        </li>
        <li>
          <form method="post" action="/logout">
            <input type="hidden" name="csrf_token" value={csrfToken} />
            <button type="submit" class="menu-item btn-danger">
              <span class="nav-icon">🚪</span>
              {t("auth.logout")}
            </button>
          </form>
        </li>
      </ul>
    </main>
  );
}

export const handler = define.handlers({
  GET(ctx) {
    return ctx.render(<MehrMenu csrfToken={ctx.state.csrfToken ?? ""} />);
  },
});
