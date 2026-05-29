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
      </head>
      <body>
        {state.user && (
          <nav>
            <a href="/items">{t("nav.items")}</a>
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
        )}
        <Component />
      </body>
    </html>
  );
});
