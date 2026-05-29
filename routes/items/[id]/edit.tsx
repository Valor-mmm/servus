import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { findItem, updateItem } from "@/lib/inventory/itemRepo.ts";
import { listCategories } from "@/lib/inventory/categoryRepo.ts";
import { listRooms } from "@/lib/inventory/roomRepo.ts";
import type { Category, Item, Room } from "@/lib/inventory/types.ts";

interface PageProps {
  item: Item;
  categories: Category[];
  rooms: Room[];
  error: string | null;
  csrfToken: string;
}

function EditItemPage(
  { item, categories, rooms, error, csrfToken }: PageProps,
) {
  return (
    <main class="page">
      <h1>{t("items.edit_title")}</h1>
      {error && <p class="error">{error}</p>}
      <form method="post" action={`/items/${item.id}/edit`}>
        <input type="hidden" name="csrf_token" value={csrfToken} />

        <label>
          {t("items.name_label")}
          <input type="text" name="name" value={item.name} required />
        </label>

        <label>
          {t("items.category_label")}
          <select name="categoryId" required>
            {categories.map((c) => (
              <option
                key={c.id}
                value={c.id}
                selected={c.id === item.categoryId}
              >
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("items.room_label")}
          <select name="roomId">
            <option value="" selected={item.roomId === null}>
              {t("items.no_room")}
            </option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id} selected={r.id === item.roomId}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("items.value_label")}
          <input
            type="number"
            name="estimatedValue"
            min="0"
            step="0.01"
            value={item.estimatedValue ?? ""}
          />
        </label>

        <button type="submit">{t("action.save")}</button>
        <a href={`/items/${item.id}`}>{t("action.cancel")}</a>
      </form>
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const item = await findItem(ctx.params.id);
    if (!item) return new Response(t("error.not_found"), { status: 404 });

    const [categories, rooms] = await Promise.all([
      listCategories(),
      listRooms(),
    ]);
    return ctx.render(
      <EditItemPage
        item={item}
        categories={categories}
        rooms={rooms}
        error={null}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const item = await findItem(ctx.params.id);
    if (!item) return new Response(t("error.not_found"), { status: 404 });

    const form = await ctx.req.formData();
    const name = ((form.get("name") as string | null) ?? "").trim();
    const categoryId = (form.get("categoryId") as string | null) ?? "";
    const roomId = (form.get("roomId") as string | null) ?? "";
    const valueRaw = (form.get("estimatedValue") as string | null) ?? "";

    if (!name) {
      const [categories, rooms] = await Promise.all([
        listCategories(),
        listRooms(),
      ]);
      return ctx.render(
        <EditItemPage
          item={item}
          categories={categories}
          rooms={rooms}
          error={t("items.error.name_required")}
          csrfToken={ctx.state.csrfToken ?? ""}
        />,
      );
    }

    const estimatedValue = valueRaw ? parseFloat(valueRaw) : null;
    await updateItem(item.id, {
      name,
      categoryId,
      roomId: roomId || null,
      estimatedValue: estimatedValue !== null && isNaN(estimatedValue)
        ? null
        : estimatedValue,
    });

    return new Response(null, {
      status: 302,
      headers: { Location: `/items/${item.id}` },
    });
  },
});
