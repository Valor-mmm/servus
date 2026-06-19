import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import {
  deleteItem,
  findItem,
  listItemsByContainer,
} from "@/lib/inventory/itemRepo.ts";
import { getR2Config } from "@/lib/photos/config.ts";
import { presignGet } from "@/lib/photos/signing.ts";
import { findCategory } from "@/lib/inventory/categoryRepo.ts";
import { resolveSchema } from "@/lib/inventory/schemaRepo.ts";
import { listItemGroups } from "@/lib/inventory/groupRepo.ts";
import { SchemaFieldsDisplay } from "@/components/SchemaFields.tsx";
import { findRoom, listRooms } from "@/lib/inventory/roomRepo.ts";
import { findBox } from "@/lib/inventory/boxRepo.ts";
import type {
  Box,
  Category,
  CategorySchema,
  Group,
  Item,
  Room,
} from "@/lib/inventory/types.ts";

interface BreadcrumbNode {
  id: string;
  name: string;
}

interface PageProps {
  item: Item;
  category: Category | null;
  schema: CategorySchema;
  room: Room | null;
  box: Box | null;
  groups: Group[];
  csrfToken: string;
  photoUrls: string[];
  // Containment
  parentContainer: Item | null;
  breadcrumb: BreadcrumbNode[]; // from room up to item (room first)
  contents: Item[];
  rooms: Room[]; // for delete dialog
}

function ItemDetailPage(
  {
    item,
    category,
    schema,
    room,
    box,
    groups,
    csrfToken,
    photoUrls,
    parentContainer,
    breadcrumb,
    contents,
    rooms,
  }: PageProps,
) {
  const displayName = item.name ||
    (item.status === "pending" ? t("items.placeholderName") : "–");
  const isContainer = category?.canContain === true;

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

      {breadcrumb.length > 0 && (
        <p class="location-breadcrumb">
          {t("items.location_breadcrumb")}: {breadcrumb.map((node, i) => (
            <>
              {i > 0 && " → "}
              {node.id
                ? <a key={node.id} href={`/items/${node.id}`}>{node.name}</a>
                : <span key={node.id}>{node.name}</span>}
            </>
          ))}
        </p>
      )}

      {parentContainer && (
        <p class="contained-in">
          {t("items.contained_in")}:{"  "}
          <a href={`/items/${parentContainer.id}`}>{parentContainer.name}</a>
        </p>
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
          : !parentContainer
          ? (
            <>
              <dt>{t("items.room_label")}</dt>
              <dd>{room?.name ?? t("items.no_room")}</dd>
            </>
          )
          : null}

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

        {isContainer && (
          <a href={`/items/${item.id}/label`} class="btn-secondary">
            {t("items.label_action")}
          </a>
        )}

        {contents.length > 0
          ? (
            <details class="delete-container-warning">
              <summary class="btn-danger">
                {t("action.delete")}
              </summary>
              <div class="delete-warning-body">
                <p>
                  {t("items.delete_container_warning", {
                    count: String(contents.length),
                  })}
                </p>
                <form
                  method="post"
                  action={`/items/${item.id}`}
                  style="display:block"
                >
                  <input type="hidden" name="csrf_token" value={csrfToken} />
                  <input type="hidden" name="_action" value="delete" />
                  <label>
                    {t("items.delete_container_room_offer")}
                    <select name="replacementRoomId">
                      <option value="">–</option>
                      {rooms.map((r) => (
                        <option
                          key={r.id}
                          value={r.id}
                          selected={r.id === room?.id}
                        >
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" class="btn-danger">
                    {t("items.delete_container_confirm")}
                  </button>
                </form>
              </div>
            </details>
          )
          : (
            <form
              method="post"
              action={`/items/${item.id}`}
              style="display:inline"
            >
              <input type="hidden" name="csrf_token" value={csrfToken} />
              <input type="hidden" name="_action" value="delete" />
              <button type="submit" class="btn-danger">
                {t("action.delete")}
              </button>
            </form>
          )}

        <a href="/items" class="btn-secondary">{t("action.back")}</a>
      </div>

      {isContainer && (
        <section class="container-contents">
          <h2>{t("items.contents_heading")}</h2>
          {contents.length === 0
            ? <p class="empty">{t("items.contents_empty")}</p>
            : (
              <ul class="item-list">
                {contents.map((c) => (
                  <li key={c.id} class="item-row">
                    <a href={`/items/${c.id}`}>
                      {c.name || t("items.placeholderName")}
                    </a>
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}
    </main>
  );
}

async function buildBreadcrumb(
  item: Item,
): Promise<BreadcrumbNode[]> {
  // Walk up the chain to the root, then prepend the room.
  const chain: Item[] = [];
  let current: Item = item;
  while (current.containerId) {
    const parent = await findItem(current.containerId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  // current is now the root
  const nodes: BreadcrumbNode[] = [];
  if (current.roomId) {
    const room = await findRoom(current.roomId);
    if (room) nodes.push({ id: "", name: room.name });
  }
  for (const c of chain) {
    nodes.push({ id: c.id, name: c.name || t("items.placeholderName") });
  }
  return nodes;
}

export const handler = define.handlers({
  async GET(ctx) {
    const item = await findItem(ctx.params.id);
    if (!item) {
      return new Response(t("error.not_found"), { status: 404 });
    }
    const [category, box, groups, rooms] = await Promise.all([
      item.categoryId ? findCategory(item.categoryId) : Promise.resolve(null),
      item.boxId ? findBox(item.boxId) : Promise.resolve(null),
      listItemGroups(item.id),
      listRooms(),
    ]);
    const schema = await resolveSchema(category?.schemaType ?? "generic");

    // Room for a non-contained item
    const room = item.roomId ? await findRoom(item.roomId) : null;

    let parentContainer: Item | null = null;
    let breadcrumb: BreadcrumbNode[] = [];
    let contents: Item[] = [];

    if (item.containerId) {
      parentContainer = await findItem(item.containerId);
      breadcrumb = await buildBreadcrumb(item);
    }

    if (category?.canContain) {
      contents = await listItemsByContainer(item.id);
      if (!item.containerId) {
        // Root container: build breadcrumb showing just the room
        if (item.roomId && room) {
          breadcrumb = [{ id: "", name: room.name }];
        }
      } else {
        breadcrumb = await buildBreadcrumb(item);
      }
    }

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
        parentContainer={parentContainer}
        breadcrumb={breadcrumb}
        contents={contents}
        rooms={rooms}
      />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const action = form.get("_action") as string;

    if (action === "delete") {
      const replacementRoomId =
        (form.get("replacementRoomId") as string | null) || null;
      let r2cfg = null;
      try {
        r2cfg = getR2Config();
      } catch { /* R2 not configured */ }
      await deleteItem(ctx.params.id, r2cfg, undefined, { replacementRoomId });
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
