import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";

export default define.page(function App({ Component, state }) {
  return (
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{t("app.name")}</title>
        {state.csrfToken && (
          <meta name="csrf-token" content={state.csrfToken} />
        )}
        <link rel="stylesheet" href="/styles.css" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a5fa8" />
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
              <a href="/items" class="nav-logo">
                <img src="/lion.svg" alt="" aria-hidden="true" />
                {t("app.name")}
              </a>
              <a href="/items">{t("nav.items")}</a>
              <a href="/boxes">{t("nav.boxes")}</a>
              <a href="/categories">{t("nav.categories")}</a>
              <a href="/rooms">{t("nav.rooms")}</a>
              <form method="post" action="/logout">
                <input
                  type="hidden"
                  name="csrf_token"
                  value={state.csrfToken ?? ""}
                />
                <button type="submit">{t("auth.logout")}</button>
              </form>
            </nav>

            {/* Mobile bottom nav */}
            <nav class="bottom-nav">
              <a href="/items">
                <span class="nav-icon">📦</span>
                {t("nav.items")}
              </a>
              <a href="/boxes">
                <span class="nav-icon">🗃️</span>
                {t("nav.boxes")}
              </a>
              <a href="/items/quick-add" class="nav-quick-add">
                <span class="nav-icon">➕</span>
                {t("nav.quickAdd")}
              </a>
              <a href="/categories">
                <span class="nav-icon">🏷️</span>
                {t("nav.categories")}
              </a>
              <a href="/rooms">
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
          </>
        )}
        <Component />
      </body>
    </html>
  );
});
