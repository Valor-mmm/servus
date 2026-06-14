import { t } from "@/lib/i18n/t.ts";

function active(current: string, href: string): string {
  return current === href || current.startsWith(href + "/")
    ? " nav-active"
    : "";
}

/**
 * Mobile bottom navigation: four primary slots (Items, Boxes, Quick-add, Mehr).
 * Secondary destinations and logout live behind the Mehr menu (`/mehr`).
 */
export function BottomNav({ path }: { path: string }) {
  return (
    <nav class="bottom-nav">
      <a href="/items" class={active(path, "/items").trim() || undefined}>
        <span class="nav-icon">📦</span>
        {t("nav.items")}
      </a>
      <a href="/boxes" class={active(path, "/boxes").trim() || undefined}>
        <span class="nav-icon">🗃️</span>
        {t("nav.boxes")}
      </a>
      <a
        href="/items/quick-add"
        class={`nav-quick-add${active(path, "/items/quick-add")}`}
      >
        <span class="nav-icon">➕</span>
        {t("nav.quickAdd")}
      </a>
      <a href="/mehr" class={active(path, "/mehr").trim() || undefined}>
        <span class="nav-icon">☰</span>
        {t("nav.more")}
      </a>
    </nav>
  );
}
