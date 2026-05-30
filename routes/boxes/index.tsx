import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { createBox, listBoxes } from "@/lib/inventory/boxRepo.ts";
import { listRooms } from "@/lib/inventory/roomRepo.ts";
import type { BoxWithItemCount } from "@/lib/inventory/boxRepo.ts";
import type { Room } from "@/lib/inventory/types.ts";

interface PageProps {
  boxes: BoxWithItemCount[];
  rooms: Room[];
  csrfToken: string;
}

function BoxesPage({ boxes, rooms, csrfToken }: PageProps) {
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.name]));

  return (
    <main class="page">
      <h1>{t("boxes.title")}</h1>

      <form method="post" action="/boxes" class="inline-form">
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input
          type="text"
          name="label"
          placeholder={t("boxes.label_placeholder")}
        />
        <select name="destinationRoomId">
          <option value="">– {t("boxes.destination_room_label")} –</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button type="submit" class="btn-primary">{t("boxes.add")}</button>
      </form>

      {boxes.length === 0
        ? (
          <div class="empty-state">
            <img src="/lion.svg" alt="" aria-hidden="true" />
            <p>{t("boxes.empty")}</p>
          </div>
        )
        : (
          <ul class="item-list">
            {boxes.map((box) => (
              <li key={box.id} class="item-row">
                <a href={`/boxes/${box.id}`}>
                  <strong>{box.code}</strong>
                  {box.label ? ` – ${box.label}` : ""}
                </a>
                <span class="meta">
                  {box.destinationRoomId
                    ? roomMap[box.destinationRoomId] ?? "–"
                    : t("boxes.no_destination_room")}
                  {" · "}
                  {t("boxes.item_count")}: {box.itemCount}
                </span>
                <span class={`badge badge-${box.status}`}>
                  {t(`boxes.status.${box.status}` as Parameters<typeof t>[0])}
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
    const [boxes, rooms] = await Promise.all([listBoxes(), listRooms()]);
    return ctx.render(
      <BoxesPage
        boxes={boxes}
        rooms={rooms}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const label = ((form.get("label") as string | null) ?? "").trim() || null;
    const destinationRoomId =
      (form.get("destinationRoomId") as string | null) || null;

    const box = await createBox({ label, destinationRoomId });
    return new Response(null, {
      status: 302,
      headers: { Location: `/boxes/${box.id}` },
    });
  },
});
