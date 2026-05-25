import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";

export default define.page(function Home() {
  return (
    <main class="page">
      <h1>{t("app.name")}</h1>
      <p class="tagline">{t("app.tagline")}</p>
      <p>{t("home.welcome")}</p>
    </main>
  );
});
