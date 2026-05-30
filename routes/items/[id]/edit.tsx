import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { findItem, updateItem } from "@/lib/inventory/itemRepo.ts";
import { listCategories } from "@/lib/inventory/categoryRepo.ts";
import { listRooms } from "@/lib/inventory/roomRepo.ts";
import { listBoxes } from "@/lib/inventory/boxRepo.ts";
import type { BoxWithItemCount } from "@/lib/inventory/boxRepo.ts";
import type { Category, Item, Room } from "@/lib/inventory/types.ts";

interface PageProps {
  item: Item;
  categories: Category[];
  rooms: Room[];
  boxes: BoxWithItemCount[];
  error: string | null;
  csrfToken: string;
}

function EditItemPage(
  { item, categories, rooms, boxes, error, csrfToken }: PageProps,
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
          <select name="categoryId">
            <option value="" selected={item.categoryId === null}>
              – {t("items.category_label")} –
            </option>
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
            <option
              value=""
              selected={item.roomId === null && item.boxId === null}
            >
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
          {t("items.box_label")}
          <select name="boxId">
            <option value="" selected={item.boxId === null}>
              {t("items.no_box")}
            </option>
            {boxes.map((b) => (
              <option key={b.id} value={b.id} selected={b.id === item.boxId}>
                {b.code}
                {b.label ? ` – ${b.label}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("items.quantity_label")}
          <input
            type="number"
            name="quantity"
            min="1"
            step="1"
            value={item.quantity}
            required
          />
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

    const [categories, rooms, boxes] = await Promise.all([
      listCategories(),
      listRooms(),
      listBoxes(),
    ]);
    return ctx.render(
      <EditItemPage
        item={item}
        categories={categories}
        rooms={rooms}
        boxes={boxes}
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
    const categoryId = (form.get("categoryId") as string | null) || null;
    const roomId = (form.get("roomId") as string | null) ?? "";
    const boxId = (form.get("boxId") as string | null) ?? "";
    const quantityRaw = (form.get("quantity") as string | null) ?? "1";
    const valueRaw = (form.get("estimatedValue") as string | null) ?? "";

    const renderError = async (error: string) => {
      const [categories, rooms, boxes] = await Promise.all([
        listCategories(),
        listRooms(),
        listBoxes(),
      ]);
      return ctx.render(
        <EditItemPage
          item={item}
          categories={categories}
          rooms={rooms}
          boxes={boxes}
          error={error}
          csrfToken={ctx.state.csrfToken ?? ""}
        />,
      );
    };

    if (!name) return renderError(t("items.error.name_required"));

    const quantity = parseInt(quantityRaw, 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return renderError(t("items.error.quantity_invalid"));
    }

    const estimatedValue = valueRaw ? parseFloat(valueRaw) : null;
    await updateItem(item.id, {
      name,
      categoryId,
      roomId: roomId || null,
      boxId: boxId || null,
      quantity,
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
