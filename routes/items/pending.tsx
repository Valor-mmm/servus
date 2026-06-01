import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { listItems } from "@/lib/inventory/itemRepo.ts";
import { listBoxes } from "@/lib/inventory/boxRepo.ts";
import type { BoxWithItemCount } from "@/lib/inventory/boxRepo.ts";
import type { Item } from "@/lib/inventory/types.ts";
import { getR2Config } from "@/lib/photos/config.ts";
import { presignGet } from "@/lib/photos/signing.ts";

interface PageProps {
  items: Item[];
  boxMap: Record<string, BoxWithItemCount>;
  thumbnailUrls: Record<string, string>;
}

function PendingItemsPage({ items, boxMap, thumbnailUrls }: PageProps) {
  return (
    <main class="page">
      <div class="page-header">
        <h1>{t("items.pending_title")}</h1>
        <a href="/items" class="btn-secondary">{t("action.back")}</a>
      </div>

      {items.length === 0
        ? (
          <div class="empty-state">
            <p>{t("items.pending_empty")}</p>
          </div>
        )
        : (
          <ul class="item-list">
            {items.map((item) => {
              const box = item.boxId ? boxMap[item.boxId] : null;
              return (
                <li key={item.id} class="item-row item-pending">
                  {thumbnailUrls[item.id] && (
                    <img
                      src={thumbnailUrls[item.id]}
                      alt=""
                      class="item-thumbnail"
                      loading="lazy"
                    />
                  )}
                  <span class="item-name">
                    {t("items.placeholderName")}
                  </span>
                  <span class="badge badge-pending">{t("items.pending")}</span>
                  <span class="meta">
                    {box
                      ? `${box.code}${box.label ? ` – ${box.label}` : ""}`
                      : ""}
                    {item.quantity > 1 ? ` · ${item.quantity}×` : ""}
                  </span>
                  <a href={`/items/${item.id}/edit`} class="btn-small">
                    {t("action.edit")}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const [allItems, boxes] = await Promise.all([
      listItems(),
      listBoxes(),
    ]);

    const items = allItems
      .filter((i) => i.status === "pending")
      .sort((a, b) => b.createdAt - a.createdAt);

    const boxMap = Object.fromEntries(boxes.map((b) => [b.id, b]));

    const thumbnailUrls: Record<string, string> = {};
    try {
      const r2cfg = getR2Config();
      const nowSec = Math.floor(Date.now() / 1000);
      for (const item of items) {
        if (item.photos.length > 0) {
          thumbnailUrls[item.id] = presignGet(r2cfg, item.photos[0], nowSec);
        }
      }
    } catch { /* R2 not configured */ }

    return ctx.render(
      <PendingItemsPage
        items={items}
        boxMap={boxMap}
        thumbnailUrls={thumbnailUrls}
      />,
    );
  },
});
