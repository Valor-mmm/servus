import { define } from "@/utils.ts";
import { count, t } from "@/lib/i18n/t.ts";
import { EmptyState } from "@/components/EmptyState.tsx";
import { listItems } from "@/lib/inventory/itemRepo.ts";
import { listBoxes } from "@/lib/inventory/boxRepo.ts";
import type { Item } from "@/lib/inventory/types.ts";
import { getR2Config } from "@/lib/photos/config.ts";
import { presignGet } from "@/lib/photos/signing.ts";

interface DashboardProps {
  totalItems: number;
  incompleteItems: number;
  packedBoxes: number;
  totalBoxes: number;
  recentItems: Item[];
  thumbnailUrls: Record<string, string>;
}

function DashboardPage(
  {
    totalItems,
    incompleteItems,
    packedBoxes,
    totalBoxes,
    recentItems,
    thumbnailUrls,
  }: DashboardProps,
) {
  return (
    <main class="page">
      <a href="/items/new" class="btn-primary dashboard-cta">
        {t("dashboard.cta")}
      </a>

      {totalItems === 0 ? <EmptyState message={t("home.welcome")} /> : (
        <>
          <div class="dashboard-tiles">
            <div class="dashboard-tile">
              <span class="dashboard-tile-value">{totalItems}</span>
              <span class="dashboard-tile-label">
                {t("dashboard.totalItems")}
              </span>
            </div>
            <a href="/items/incomplete" class="dashboard-tile">
              <span class="dashboard-tile-value">{incompleteItems}</span>
              <span class="dashboard-tile-label">
                {t("dashboard.incompleteItems")}
              </span>
            </a>
            <div class="dashboard-tile">
              <span class="dashboard-tile-value">
                {packedBoxes}/{totalBoxes}
              </span>
              <span class="dashboard-tile-label">
                {t("dashboard.packedBoxes")}
              </span>
            </div>
            <div class="dashboard-tile">
              <span class="dashboard-tile-value">
                {count(totalBoxes, t("boxes.singular"), t("boxes.plural"))}
              </span>
              <span class="dashboard-tile-label">
                {t("nav.boxes")}
              </span>
            </div>
          </div>

          <div class="dashboard-recent">
            <h2>{t("dashboard.recent")}</h2>
            <ul class="dashboard-recent-list">
              {recentItems.map((item) => (
                <li key={item.id}>
                  <a href={`/items/${item.id}`} class="dashboard-recent-item">
                    {thumbnailUrls[item.id] && (
                      <img
                        data-src={thumbnailUrls[item.id]}
                        alt=""
                        class="dashboard-recent-thumb"
                        width="36"
                        height="36"
                      />
                    )}
                    <span>
                      {item.name || t("items.placeholderName")}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const [allItems, allBoxes] = await Promise.all([
      listItems(),
      listBoxes(),
    ]);

    const totalItems = allItems.length;
    const incompleteItems = allItems.filter((i) => i.status === "incomplete")
      .length;
    const totalBoxes = allBoxes.length;
    const packedBoxes = allBoxes.filter((b) =>
      b.status === "packed" || b.status === "delivered"
    ).length;

    const recentItems = [...allItems]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    const thumbnailUrls: Record<string, string> = {};
    try {
      const r2cfg = getR2Config();
      const nowSec = Math.floor(Date.now() / 1000);
      for (const item of recentItems) {
        if (item.photos.length > 0) {
          thumbnailUrls[item.id] = presignGet(r2cfg, item.photos[0], nowSec);
        }
      }
    } catch {
      // R2 not configured — thumbnails silently absent
    }

    return ctx.render(
      <DashboardPage
        totalItems={totalItems}
        incompleteItems={incompleteItems}
        packedBoxes={packedBoxes}
        totalBoxes={totalBoxes}
        recentItems={recentItems}
        thumbnailUrls={thumbnailUrls}
      />,
    );
  },
});
