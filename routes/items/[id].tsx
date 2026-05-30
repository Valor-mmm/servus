import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { deleteItem, findItem } from "@/lib/inventory/itemRepo.ts";
import { findCategory } from "@/lib/inventory/categoryRepo.ts";
import { findRoom } from "@/lib/inventory/roomRepo.ts";
import { findBox } from "@/lib/inventory/boxRepo.ts";
import type { Box, Category, Item, Room } from "@/lib/inventory/types.ts";

interface PageProps {
  item: Item;
  category: Category | null;
  room: Room | null;
  box: Box | null;
  csrfToken: string;
}

function ItemDetailPage({ item, category, room, box, csrfToken }: PageProps) {
  return (
    <main class="page">
      <h1>{t("items.detail_title")}: {item.name}</h1>

      <dl class="detail-list">
        <dt>{t("items.category_label")}</dt>
        <dd>{category?.name ?? "–"}</dd>

        {box
          ? (
            <>
              <dt>{t("items.in_box")}</dt>
              <dd>
                <a href={`/boxes/${box.id}`}>
                  {box.code}
                  {box.label ? ` – ${box.label}` : ""}
                </a>
              </dd>
            </>
          )
          : (
            <>
              <dt>{t("items.room_label")}</dt>
              <dd>{room?.name ?? t("items.no_room")}</dd>
            </>
          )}

        {item.estimatedValue !== null && (
          <>
            <dt>{t("items.estimated_value")}</dt>
            <dd>{item.estimatedValue} €</dd>
          </>
        )}

        <dt>{t("items.created_at")}</dt>
        <dd>{new Date(item.createdAt).toLocaleDateString("de-DE")}</dd>

        <dt>{t("items.updated_at")}</dt>
        <dd>{new Date(item.updatedAt).toLocaleDateString("de-DE")}</dd>
      </dl>

      <div class="actions">
        <a href={`/items/${item.id}/edit`} class="btn-secondary">
          {t("action.edit")}
        </a>

        <form method="post" action={`/items/${item.id}`} style="display:inline">
          <input type="hidden" name="csrf_token" value={csrfToken} />
          <input type="hidden" name="_action" value="delete" />
          <button type="submit" class="btn-danger">
            {t("action.delete")}
          </button>
        </form>

        <a href="/items">{t("action.back")}</a>
      </div>
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const item = await findItem(ctx.params.id);
    if (!item) {
      return new Response(t("error.not_found"), { status: 404 });
    }
    const [category, room, box] = await Promise.all([
      item.categoryId ? findCategory(item.categoryId) : Promise.resolve(null),
      item.roomId ? findRoom(item.roomId) : Promise.resolve(null),
      item.boxId ? findBox(item.boxId) : Promise.resolve(null),
    ]);
    return ctx.render(
      <ItemDetailPage
        item={item}
        category={category}
        room={room}
        box={box}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const action = form.get("_action") as string;

    if (action === "delete") {
      await deleteItem(ctx.params.id);
      return new Response(null, {
        status: 302,
        headers: { Location: "/items" },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `/items/${ctx.params.id}` },
    });
  },
});
