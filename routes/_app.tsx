import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { classNameFor, THEME_COLOR, THEME_RAUTE } from "@/lib/styles/theme.ts";

function navActive(current: string, href: string): string {
  const match = current === href || current.startsWith(href + "/");
  return match ? " nav-active" : "";
}

export default define.page(function App({ Component, state, url }) {
  const path = url?.pathname ?? "/";
  // SSR can't know the user's preference; render the default and let the
  // pre-paint script swap before first paint.
  const initialTheme = THEME_RAUTE;
  const initialClass = classNameFor(initialTheme);

  return (
    <html lang="de" class={initialClass}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{t("app.name")}</title>
        {
          /* theme-color must be in the DOM before theme-init.js runs so the
            pre-paint script can update its `content` attribute. */
        }
        <meta name="theme-color" content={THEME_COLOR[initialTheme]} />
        {/* Anti-flash: apply html.theme-* before the stylesheet loads. */}
        <script src="/theme-init.js" />
        {state.csrfToken && (
          <meta name="csrf-token" content={state.csrfToken} />
        )}
        <link rel="stylesheet" href="/styles.css" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content={t("app.name")} />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body>
        {state.user && (
          <>
            {/* Desktop top nav */}
            <nav class="top-nav">
              <a
                href="/items"
                class="nav-logo"
                title={t("app.name")}
              >
                <img src="/lion.svg" alt="" aria-hidden="true" />
                {t("app.name")}
              </a>
              <a
                href="/items"
                class={navActive(path, "/items").trim() || undefined}
                title={t("nav.items")}
              >
                {t("nav.items")}
              </a>
              <a
                href="/boxes"
                class={navActive(path, "/boxes").trim() || undefined}
                title={t("nav.boxes")}
              >
                {t("nav.boxes")}
              </a>
              <a
                href="/categories"
                class={navActive(path, "/categories").trim() || undefined}
                title={t("nav.categories")}
              >
                {t("nav.categories")}
              </a>
              <a
                href="/rooms"
                class={navActive(path, "/rooms").trim() || undefined}
                title={t("nav.rooms")}
              >
                {t("nav.rooms")}
              </a>
              <a
                href="/admin/invites"
                class={navActive(path, "/admin/invites").trim() || undefined}
                title={t("invites.nav")}
              >
                {t("invites.nav")}
              </a>
              <button
                type="button"
                class="theme-toggle"
                aria-label={t("nav.toggleTheme")}
                data-theme-toggle
              >
                🌙
              </button>
              <form method="post" action="/logout">
                <input
                  type="hidden"
                  name="csrf_token"
                  value={state.csrfToken ?? ""}
                />
                <button type="submit" title={t("auth.logout")}>
                  {t("auth.logout")}
                </button>
              </form>
            </nav>

            {/* Mobile bottom nav */}
            <nav class="bottom-nav">
              <a
                href="/items"
                class={navActive(path, "/items").trim() || undefined}
              >
                <span class="nav-icon">📦</span>
                {t("nav.items")}
              </a>
              <a
                href="/boxes"
                class={navActive(path, "/boxes").trim() || undefined}
              >
                <span class="nav-icon">🗃️</span>
                {t("nav.boxes")}
              </a>
              <a
                href="/items/quick-add"
                class={`nav-quick-add${navActive(path, "/items/quick-add")}`}
              >
                <span class="nav-icon">➕</span>
                {t("nav.quickAdd")}
              </a>
              <a
                href="/categories"
                class={navActive(path, "/categories").trim() || undefined}
              >
                <span class="nav-icon">🏷️</span>
                {t("nav.categories")}
              </a>
              <a
                href="/rooms"
                class={navActive(path, "/rooms").trim() || undefined}
              >
                <span class="nav-icon">🏠</span>
                {t("nav.rooms")}
              </a>
              <form method="post" action="/logout">
                <input
                  type="hidden"
                  name="csrf_token"
                  value={state.csrfToken ?? ""}
                />
                <button type="submit">
                  <span class="nav-icon">🚪</span>
                  {t("auth.logout")}
                </button>
              </form>
            </nav>

            {/* Mobile theme toggle FAB */}
            <button
              type="button"
              class="theme-toggle-fab"
              aria-label={t("nav.toggleTheme")}
              data-theme-toggle
            >
              🌙
            </button>
          </>
        )}
        <Component />

        {/* Lazy-load thumbnails + theme toggle wiring + presigned URL error handling */}
        <script src="/app-init.js" />
      </body>
    </html>
  );
});
