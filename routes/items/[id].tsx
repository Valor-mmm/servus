import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { deleteItem, findItem } from "@/lib/inventory/itemRepo.ts";
import { getR2Config } from "@/lib/photos/config.ts";
import { presignGet } from "@/lib/photos/signing.ts";
import { findCategory } from "@/lib/inventory/categoryRepo.ts";
import { resolveSchema } from "@/lib/inventory/schemaRepo.ts";
import { listItemGroups } from "@/lib/inventory/groupRepo.ts";
import { SchemaFieldsDisplay } from "@/components/SchemaFields.tsx";
import { findRoom } from "@/lib/inventory/roomRepo.ts";
import { findBox } from "@/lib/inventory/boxRepo.ts";
import type {
  Box,
  Category,
  CategorySchema,
  Group,
  Item,
  Room,
} from "@/lib/inventory/types.ts";

interface PageProps {
  item: Item;
  category: Category | null;
  schema: CategorySchema;
  room: Room | null;
  box: Box | null;
  groups: Group[];
  csrfToken: string;
  photoUrls: string[];
}

function ItemDetailPage(
  { item, category, schema, room, box, groups, csrfToken, photoUrls }:
    PageProps,
) {
  const displayName = item.name ||
    (item.status === "pending" ? t("items.placeholderName") : "–");
  return (
    <main class="page">
      <h1>
        {t("items.detail_title")}: {displayName}
        {item.status === "pending" && (
          <span class="badge badge-pending">{t("items.pending")}</span>
        )}
      </h1>
      {photoUrls.length > 0 && (
        <div class="photo-gallery">
          {photoUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              class="photo-gallery-img"
              loading="lazy"
            />
          ))}
        </div>
      )}

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

        {item.warrantyUntil && (
          <>
            <dt>{t("items.warranty_display")}</dt>
            <dd>
              {new Date(item.warrantyUntil).toLocaleDateString("de-DE")}
            </dd>
          </>
        )}

        <SchemaFieldsDisplay schema={schema} metadata={item.metadata} />

        {groups.length > 0 && (
          <>
            <dt>{t("items.groups_label")}</dt>
            <dd>
              <ul class="group-chips">
                {groups.map((g) => (
                  <li key={g.id} class="group-chip">
                    <a href={`/groups/${g.id}`}>{g.name}</a>
                  </li>
                ))}
              </ul>
            </dd>
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

        <a href="/items" class="btn-secondary">{t("action.back")}</a>
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
    const [category, room, box, groups] = await Promise.all([
      item.categoryId ? findCategory(item.categoryId) : Promise.resolve(null),
      item.roomId ? findRoom(item.roomId) : Promise.resolve(null),
      item.boxId ? findBox(item.boxId) : Promise.resolve(null),
      listItemGroups(item.id),
    ]);
    const schema = await resolveSchema(category?.schemaType ?? "generic");
    let photoUrls: string[] = [];
    try {
      const r2cfg = getR2Config();
      const nowSec = Math.floor(Date.now() / 1000);
      photoUrls = item.photos.map((key) => presignGet(r2cfg, key, nowSec));
    } catch { /* R2 not configured */ }

    return ctx.render(
      <ItemDetailPage
        item={item}
        category={category}
        schema={schema}
        room={room}
        box={box}
        groups={groups}
        csrfToken={ctx.state.csrfToken ?? ""}
        photoUrls={photoUrls}
      />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const action = form.get("_action") as string;

    if (action === "delete") {
      let r2cfg = null;
      try {
        r2cfg = getR2Config();
      } catch { /* R2 not configured */ }
      await deleteItem(ctx.params.id, r2cfg);
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
