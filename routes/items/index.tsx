import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { listItems } from "@/lib/inventory/itemRepo.ts";
import { listCategories } from "@/lib/inventory/categoryRepo.ts";
import { listRooms } from "@/lib/inventory/roomRepo.ts";
import type { Category, Item, Room } from "@/lib/inventory/types.ts";

interface PageProps {
  items: Item[];
  categories: Category[];
  rooms: Room[];
  search: string;
  categoryId: string;
  roomId: string;
}

function ItemsPage(
  { items, categories, rooms, search, categoryId, roomId }: PageProps,
) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.name]));

  return (
    <main class="page">
      <div class="page-header">
        <h1>{t("items.title")}</h1>
        <a href="/items/new" class="btn-primary">{t("items.add")}</a>
      </div>

      <form method="get" action="/items" class="filter-form">
        <input
          type="text"
          name="q"
          value={search}
          placeholder={t("items.search_placeholder")}
        />
        <select name="cat">
          <option value="">
            {t("items.filter_all")} {t("items.filter_category")}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id} selected={c.id === categoryId}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="room">
          <option value="">
            {t("items.filter_all")} {t("items.filter_room")}
          </option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id} selected={r.id === roomId}>
              {r.name}
            </option>
          ))}
        </select>
        <button type="submit">{t("action.filter")}</button>
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
              <li key={item.id} class="item-row">
                <a href={`/items/${item.id}`}>{item.name}</a>
                <span class="meta">
                  {item.categoryId ? (catMap[item.categoryId] ?? "–") : "–"}
                  {item.roomId ? ` · ${roomMap[item.roomId] ?? "–"}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const q = ctx.url.searchParams.get("q") ?? "";
    const catFilter = ctx.url.searchParams.get("cat") ?? "";
    const roomFilter = ctx.url.searchParams.get("room") ?? "";

    const [allItems, categories, rooms] = await Promise.all([
      listItems(),
      listCategories(),
      listRooms(),
    ]);

    let items = allItems;
    if (q) {
      const lower = q.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(lower));
    }
    if (catFilter) {
      items = items.filter((i) => i.categoryId === catFilter);
    }
    if (roomFilter) {
      items = items.filter((i) => i.roomId === roomFilter);
    }

    return ctx.render(
      <ItemsPage
        items={items}
        categories={categories}
        rooms={rooms}
        search={q}
        categoryId={catFilter}
        roomId={roomFilter}
      />,
    );
  },
});
