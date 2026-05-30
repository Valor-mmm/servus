import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { createItem } from "@/lib/inventory/itemRepo.ts";
import { listCategories } from "@/lib/inventory/categoryRepo.ts";
import { listRooms } from "@/lib/inventory/roomRepo.ts";
import { listBoxes } from "@/lib/inventory/boxRepo.ts";
import type { BoxWithItemCount } from "@/lib/inventory/boxRepo.ts";
import type { Category, Room } from "@/lib/inventory/types.ts";

interface PageProps {
  categories: Category[];
  rooms: Room[];
  boxes: BoxWithItemCount[];
  error: string | null;
  csrfToken: string;
}

function NewItemPage(
  { categories, rooms, boxes, error, csrfToken }: PageProps,
) {
  return (
    <main class="page">
      <h1>{t("items.new_title")}</h1>
      {error && <p class="error">{error}</p>}
      <form method="post" action="/items/new">
        <input type="hidden" name="csrf_token" value={csrfToken} />

        <label>
          {t("items.name_label")}
          <input
            type="text"
            name="name"
            placeholder={t("items.name_placeholder")}
            required
          />
        </label>

        <label>
          {t("items.category_label")}
          <select name="categoryId" required>
            <option value="">– {t("items.category_label")} –</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label>
          {t("items.room_label")}
          <select name="roomId">
            <option value="">{t("items.no_room")}</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}
            </option>)}
          </select>
        </label>

        <label>
          {t("items.box_label")}
          <select name="boxId">
            <option value="">{t("items.no_box")}</option>
            {boxes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
                {b.label ? ` – ${b.label}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("items.value_label")}
          <input type="number" name="estimatedValue" min="0" step="0.01" />
        </label>

        <button type="submit">{t("action.save")}</button>
        <a href="/items">{t("action.cancel")}</a>
      </form>
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const [categories, rooms, boxes] = await Promise.all([
      listCategories(),
      listRooms(),
      listBoxes(),
    ]);
    return ctx.render(
      <NewItemPage
        categories={categories}
        rooms={rooms}
        boxes={boxes}
        error={null}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const name = ((form.get("name") as string | null) ?? "").trim();
    const categoryId = (form.get("categoryId") as string | null) ?? "";
    const roomId = (form.get("roomId") as string | null) ?? "";
    const boxId = (form.get("boxId") as string | null) ?? "";
    const valueRaw = (form.get("estimatedValue") as string | null) ?? "";

    if (!name) {
      const [categories, rooms, boxes] = await Promise.all([
        listCategories(),
        listRooms(),
        listBoxes(),
      ]);
      return ctx.render(
        <NewItemPage
          categories={categories}
          rooms={rooms}
          boxes={boxes}
          error={t("items.error.name_required")}
          csrfToken={ctx.state.csrfToken ?? ""}
        />,
      );
    }

    if (!categoryId) {
      const [categories, rooms, boxes] = await Promise.all([
        listCategories(),
        listRooms(),
        listBoxes(),
      ]);
      return ctx.render(
        <NewItemPage
          categories={categories}
          rooms={rooms}
          boxes={boxes}
          error={t("items.error.category_required")}
          csrfToken={ctx.state.csrfToken ?? ""}
        />,
      );
    }

    const estimatedValue = valueRaw ? parseFloat(valueRaw) : null;
    await createItem({
      name,
      categoryId,
      roomId: roomId || null,
      boxId: boxId || null,
      estimatedValue: estimatedValue !== null && isNaN(estimatedValue)
        ? null
        : estimatedValue,
    });

    return new Response(null, { status: 302, headers: { Location: "/items" } });
  },
});
