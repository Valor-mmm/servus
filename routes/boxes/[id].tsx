import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import {
  findBox,
  markBoxDelivered,
  tombstoneDeleteBox,
  updateBox,
  updateBoxStatus,
} from "@/lib/inventory/boxRepo.ts";
import {
  createItem,
  listItemsByBox,
  updateItem,
} from "@/lib/inventory/itemRepo.ts";
import { listCategories } from "@/lib/inventory/categoryRepo.ts";
import { findRoom, listRooms } from "@/lib/inventory/roomRepo.ts";
import type { Box, Item, Room } from "@/lib/inventory/types.ts";
import QuantityControl from "@/islands/QuantityControl.tsx";

interface PageProps {
  box: Box;
  items: Item[];
  destinationRoom: Room | null;
  rooms: Room[];
  error: string | null;
  addedCount: number | null;
  csrfToken: string;
  categoryMap: Record<string, string>;
  showConfetti: boolean;
}

function BoxDetailPage(
  {
    box,
    items,
    destinationRoom,
    rooms,
    error,
    addedCount,
    csrfToken,
    categoryMap,
    showConfetti,
  }: PageProps,
) {
  return (
    <>
      {showConfetti && <script src="/confetti.js" />}
      <main class="page">
        <h1>
          {t("boxes.detail_title")}: <strong>{box.code}</strong>
          {box.label ? ` – ${box.label}` : ""}
        </h1>

        <dl class="detail-list">
          <dt>{t("boxes.destination_room_label")}</dt>
          <dd>{destinationRoom?.name ?? t("boxes.no_destination_room")}</dd>
          <dt>{t("boxes.status_label")}</dt>
          <dd>
            <span class={`badge badge-${box.status}`}>
              {t(`boxes.status.${box.status}` as Parameters<typeof t>[0])}
            </span>
          </dd>
        </dl>

        <div class="actions">
          <a href={`/boxes/${box.id}/edit`} class="btn-secondary">
            {t("action.edit")}
          </a>
          <a href={`/boxes/${box.id}/label`} class="btn-secondary">
            {t("boxes.label_page_title")}
          </a>
          {box.status === "packed" && (
            <form
              method="post"
              action={`/boxes/${box.id}`}
              style="display:inline"
            >
              <input type="hidden" name="csrf_token" value={csrfToken} />
              <input type="hidden" name="_action" value="mark_delivered" />
              <button type="submit" class="btn-primary">
                {t("boxes.action.mark_delivered")}
              </button>
            </form>
          )}
          {items.length === 0 && box.status !== "delivered" && (
            <form
              method="post"
              action={`/boxes/${box.id}`}
              style="display:inline"
            >
              <input type="hidden" name="csrf_token" value={csrfToken} />
              <input type="hidden" name="_action" value="delete" />
              <button type="submit" class="btn-danger">
                {t("action.delete")}
              </button>
            </form>
          )}
          <a href="/boxes">{t("action.back")}</a>
        </div>

        {error && <p class="error">{error}</p>}
        {addedCount !== null && (
          <p class="success">
            {t("boxes.bulk_add_result", { count: String(addedCount) })}
          </p>
        )}

        {box.status === "delivered" && box.destinationRoomId === null && (
          <section class="assign-room-section">
            <h2>{t("boxes.assign_room_heading")}</h2>
            <form method="post" action={`/boxes/${box.id}`} class="inline-form">
              <input type="hidden" name="csrf_token" value={csrfToken} />
              <input type="hidden" name="_action" value="assign_room" />
              <select name="roomId" required>
                <option value="">
                  — {t("boxes.destination_room_label")} —
                </option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button type="submit" class="btn-primary">
                {t("boxes.action.assign_room")}
              </button>
            </form>
          </section>
        )}

        <h2>{t("boxes.item_count")}</h2>

        {items.length === 0
          ? <p class="empty">{t("boxes.items_empty")}</p>
          : (
            <ul class="item-list">
              {items.map((item) => (
                <li key={item.id} class="item-row">
                  <a href={`/items/${item.id}`}>{item.name}</a>
                  <span class="meta">
                    {item.categoryId
                      ? (categoryMap[item.categoryId] ?? "–")
                      : "–"}
                  </span>
                  <QuantityControl
                    itemId={item.id}
                    initialQuantity={item.quantity}
                    csrfToken={csrfToken}
                    readonly={box.status === "delivered"}
                  />
                  {box.status === "delivered"
                    ? (
                      <form
                        method="post"
                        action={`/boxes/${box.id}`}
                        style="display:inline"
                      >
                        <input
                          type="hidden"
                          name="csrf_token"
                          value={csrfToken}
                        />
                        <input
                          type="hidden"
                          name="_action"
                          value="place_item"
                        />
                        <input type="hidden" name="itemId" value={item.id} />
                        <select name="roomId">
                          <option value="">
                            — {t("boxes.place_item_label")} —
                          </option>
                          {rooms.map((r) => (
                            <option
                              key={r.id}
                              value={r.id}
                              selected={r.id === box.destinationRoomId}
                            >
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit" class="btn-small">
                          {t("boxes.action.place_item")}
                        </button>
                      </form>
                    )
                    : (
                      <form
                        method="post"
                        action={`/boxes/${box.id}`}
                        style="display:inline"
                      >
                        <input
                          type="hidden"
                          name="csrf_token"
                          value={csrfToken}
                        />
                        <input
                          type="hidden"
                          name="_action"
                          value="remove_item"
                        />
                        <input
                          type="hidden"
                          name="itemId"
                          value={item.id}
                        />
                        <button type="submit" class="btn-small">
                          {t("boxes.remove_item")}
                        </button>
                      </form>
                    )}
                </li>
              ))}
            </ul>
          )}

        {box.status === "delivered" && box.destinationRoomId !== null && (
          <form
            method="post"
            action={`/boxes/${box.id}`}
            class="unpack-all-form"
          >
            <input type="hidden" name="csrf_token" value={csrfToken} />
            <input type="hidden" name="_action" value="unpack_all" />
            <button type="submit" class="btn-primary">
              {t("boxes.action.unpack_all", {
                room: destinationRoom?.name ?? "",
              })}
            </button>
          </form>
        )}

        {box.status !== "delivered" && (
          <>
            <h2>{t("boxes.bulk_add_label")}</h2>
            <form method="post" action={`/boxes/${box.id}`}>
              <input type="hidden" name="csrf_token" value={csrfToken} />
              <input type="hidden" name="_action" value="bulk_add" />
              <textarea
                name="names"
                rows={6}
                placeholder={t("boxes.bulk_add_placeholder")}
              />
              <button type="submit" class="btn-primary">
                {t("boxes.bulk_add_submit")}
              </button>
            </form>
          </>
        )}
      </main>
    </>
  );
}

async function bulkAddItems(
  boxId: string,
  rawNames: string,
): Promise<number> {
  const names = rawNames
    .split(/[\n,]/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  let added = 0;
  for (const name of names) {
    await createItem({
      name,
      categoryId: null,
      roomId: null,
      boxId,
      estimatedValue: null,
    });
    added++;
  }
  return added;
}

export const handler = define.handlers({
  async GET(ctx) {
    const box = await findBox(ctx.params.id);
    if (!box) return new Response(t("error.not_found"), { status: 404 });

    const [items, destinationRoom, categories, rooms] = await Promise.all([
      listItemsByBox(box.id),
      box.destinationRoomId
        ? findRoom(box.destinationRoomId)
        : Promise.resolve(null),
      listCategories(),
      listRooms(),
    ]);

    const categoryMap = Object.fromEntries(
      categories.map((c) => [c.id, c.name]),
    );
    const addedParam = ctx.url.searchParams.get("added");
    const addedCount = addedParam !== null ? Number(addedParam) : null;
    const showConfetti = ctx.url.searchParams.has("delivered");

    return ctx.render(
      <BoxDetailPage
        box={box}
        items={items}
        destinationRoom={destinationRoom}
        rooms={rooms}
        error={null}
        addedCount={addedCount}
        csrfToken={ctx.state.csrfToken ?? ""}
        categoryMap={categoryMap}
        showConfetti={showConfetti}
      />,
    );
  },

  async POST(ctx) {
    const box = await findBox(ctx.params.id);
    if (!box) return new Response(t("error.not_found"), { status: 404 });

    const form = await ctx.req.formData();
    const action = (form.get("_action") as string | null) ?? "";

    if (action === "delete") {
      const currentItems = await listItemsByBox(box.id);
      if (currentItems.length > 0) {
        const [destinationRoom, categories, rooms] = await Promise.all([
          box.destinationRoomId
            ? findRoom(box.destinationRoomId)
            : Promise.resolve(null),
          listCategories(),
          listRooms(),
        ]);
        const categoryMap = Object.fromEntries(
          categories.map((c) => [c.id, c.name]),
        );
        return ctx.render(
          <BoxDetailPage
            box={box}
            items={currentItems}
            destinationRoom={destinationRoom}
            rooms={rooms}
            error={t("boxes.error.not_empty")}
            addedCount={null}
            csrfToken={ctx.state.csrfToken ?? ""}
            categoryMap={categoryMap}
            showConfetti={false}
          />,
        );
      }
      await tombstoneDeleteBox(box, "manual");
      return new Response(null, {
        status: 302,
        headers: { Location: "/boxes" },
      });
    }

    if (action === "mark_delivered") {
      await markBoxDelivered(box.id);
      return new Response(null, {
        status: 302,
        headers: { Location: `/boxes/${box.id}?delivered=1` },
      });
    }

    if (action === "assign_room") {
      const roomId = (form.get("roomId") as string | null) ?? "";
      if (roomId) {
        await updateBox(box.id, { destinationRoomId: roomId });
      }
      return new Response(null, {
        status: 302,
        headers: { Location: `/boxes/${box.id}` },
      });
    }

    if (action === "place_item") {
      const itemId = (form.get("itemId") as string | null) ?? "";
      const roomId = (form.get("roomId") as string | null) ?? "";
      if (itemId && roomId) {
        await updateItem(itemId, { roomId, boxId: null });
        await updateBoxStatus(box.id);
        const remaining = await listItemsByBox(box.id);
        if (remaining.length === 0) {
          await tombstoneDeleteBox(box, "unpacked");
          return new Response(null, {
            status: 302,
            headers: { Location: "/boxes" },
          });
        }
      }
      return new Response(null, {
        status: 302,
        headers: { Location: `/boxes/${box.id}` },
      });
    }

    if (action === "unpack_all") {
      if (box.destinationRoomId) {
        const items = await listItemsByBox(box.id);
        for (const item of items) {
          await updateItem(item.id, {
            roomId: box.destinationRoomId,
            boxId: null,
          });
        }
        await tombstoneDeleteBox(box, "unpacked");
        return new Response(null, {
          status: 302,
          headers: { Location: "/boxes" },
        });
      }
      return new Response(null, {
        status: 302,
        headers: { Location: `/boxes/${box.id}` },
      });
    }

    if (action === "remove_item") {
      const itemId = (form.get("itemId") as string | null) ?? "";
      if (itemId) {
        await updateItem(itemId, { boxId: null });
      }
      return new Response(null, {
        status: 302,
        headers: { Location: `/boxes/${box.id}` },
      });
    }

    if (action === "bulk_add") {
      const rawNames = (form.get("names") as string | null) ?? "";
      const added = await bulkAddItems(box.id, rawNames);
      return new Response(null, {
        status: 302,
        headers: { Location: `/boxes/${box.id}?added=${added}` },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `/boxes/${box.id}` },
    });
  },
});
