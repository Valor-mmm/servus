import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import {
  countItems,
  listItems,
  listItemsByCategory,
  listItemsByRoom,
  listItemsRecent,
} from "@/lib/inventory/itemRepo.ts";
import { listCategories } from "@/lib/inventory/categoryRepo.ts";
import { listRooms } from "@/lib/inventory/roomRepo.ts";
import type { Category, Item, Room } from "@/lib/inventory/types.ts";
import QuantityControl from "@/islands/QuantityControl.tsx";
import { getR2Config } from "@/lib/photos/config.ts";
import { presignGet } from "@/lib/photos/signing.ts";

const RECENT_LIMIT = 50;

interface PageProps {
  items: Item[];
  categories: Category[];
  rooms: Room[];
  search: string;
  categoryId: string;
  roomId: string;
  csrfToken: string;
  thumbnailUrls: Record<string, string>;
  isLimitedView: boolean;
  totalCount: number;
}

function displayName(item: Item): string {
  if (item.name) return item.name;
  if (item.status === "pending") return t("items.placeholderName");
  return "–";
}

function ItemsPage(
  {
    items,
    categories,
    rooms,
    search,
    categoryId,
    roomId,
    csrfToken,
    thumbnailUrls,
    isLimitedView,
    totalCount,
  }: PageProps,
) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.name]));

  return (
    <main class="page">
      <div class="page-header">
        <h1>
          {isLimitedView
            ? `${RECENT_LIMIT} ${t("items.recentCount")} (${totalCount})`
            : t("items.title")}
        </h1>
        <a href="/items/new" class="btn-primary">{t("items.add")}</a>
      </div>

      <form method="get" action="/items" class="filter-form">
        <div class="filter-search">
          <input
            type="text"
            name="q"
            value={search}
            placeholder={t("items.search_placeholder")}
          />
          <button
            type="submit"
            class="btn-icon"
            aria-label={t("action.search")}
          >
            🔍
          </button>
        </div>
        <select name="cat" data-autosubmit>
          <option value="">
            {t("items.filter_all")} {t("items.filter_category")}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id} selected={c.id === categoryId}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="room" data-autosubmit>
          <option value="">
            {t("items.filter_all")} {t("items.filter_room")}
          </option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id} selected={r.id === roomId}>
              {r.name}
            </option>
          ))}
        </select>
      </form>

      {items.length === 0
        ? (
          <div class="empty-state">
            <img src="/lion.svg" alt="" aria-hidden="true" />
            <p>{t("items.empty")}</p>
          </div>
        )
        : (
          <ul class="item-list">
            {items.map((item) => (
              <li
                key={item.id}
                class={`item-row${
                  item.status === "pending" ? " item-pending" : ""
                }`}
              >
                {thumbnailUrls[item.id] && (
                  <img
                    data-src={thumbnailUrls[item.id]}
                    alt=""
                    class="item-thumbnail"
                    width="40"
                    height="40"
                  />
                )}
                <div class="item-row-body">
                  <div class="item-row-top">
                    <a href={`/items/${item.id}`}>{displayName(item)}</a>
                    {item.status === "pending" && (
                      <span class="badge badge-pending">
                        {t("items.pending")}
                      </span>
                    )}
                  </div>
                  <span class="meta">
                    {item.categoryId ? (catMap[item.categoryId] ?? "–") : "–"}
                    {item.roomId ? ` · ${roomMap[item.roomId] ?? "–"}` : ""}
                  </span>
                </div>
                <QuantityControl
                  itemId={item.id}
                  initialQuantity={item.quantity}
                  csrfToken={csrfToken}
                  readonly={false}
                />
              </li>
            ))}
          </ul>
        )}

      {isLimitedView && (
        <div class="load-all-container">
          <a href="/items?all=1" class="btn-secondary">
            {t("items.loadAll")}
          </a>
        </div>
      )}
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const q = ctx.url.searchParams.get("q") ?? "";
    const catFilter = ctx.url.searchParams.get("cat") ?? "";
    const roomFilter = ctx.url.searchParams.get("room") ?? "";
    const loadAll = ctx.url.searchParams.get("all") === "1";

    const hasFilter = !!(q || catFilter || roomFilter || loadAll);
    const isLimitedView = !hasFilter;

    // Filter-aware dispatch: use narrowest available index
    let items: Item[];
    if (loadAll) {
      items = await listItems();
    } else if (catFilter && q) {
      items = await listItemsByCategory(catFilter);
      const lower = q.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(lower));
    } else if (catFilter) {
      items = await listItemsByCategory(catFilter);
    } else if (roomFilter && q) {
      items = await listItemsByRoom(roomFilter);
      const lower = q.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(lower));
    } else if (roomFilter) {
      items = await listItemsByRoom(roomFilter);
    } else if (q) {
      items = await listItems();
      const lower = q.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(lower));
    } else {
      items = await listItemsRecent(RECENT_LIMIT);
      // Fallback for items created before the time index existed
      if (items.length === 0) {
        items = await listItems();
      }
    }

    const [categories, rooms, totalCount] = await Promise.all([
      listCategories(),
      listRooms(),
      isLimitedView ? countItems() : Promise.resolve(0),
    ]);

    const thumbnailUrls: Record<string, string> = {};
    try {
      const r2cfg = getR2Config();
      const nowSec = Math.floor(Date.now() / 1000);
      for (const item of items) {
        if (item.photos.length > 0) {
          thumbnailUrls[item.id] = presignGet(r2cfg, item.photos[0], nowSec);
        }
      }
    } catch {
      // R2 not configured — thumbnails silently absent
    }

    return ctx.render(
      <ItemsPage
        items={items}
        categories={categories}
        rooms={rooms}
        search={q}
        categoryId={catFilter}
        roomId={roomFilter}
        csrfToken={ctx.state.csrfToken ?? ""}
        thumbnailUrls={thumbnailUrls}
        isLimitedView={isLimitedView}
        totalCount={totalCount}
      />,
    );
  },
});
