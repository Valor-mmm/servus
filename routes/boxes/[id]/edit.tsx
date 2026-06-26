import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { findBox, updateBox } from "@/lib/inventory/boxRepo.ts";
import { listRooms } from "@/lib/inventory/roomRepo.ts";
import type { Box, Room } from "@/lib/inventory/types.ts";

interface PageProps {
  box: Box;
  rooms: Room[];
  csrfToken: string;
}

function EditBoxPage({ box, rooms, csrfToken }: PageProps) {
  return (
    <main class="page">
      <h1>{t("boxes.edit_title")}: {box.code}</h1>
      <form method="post" action={`/boxes/${box.id}/edit`}>
        <input type="hidden" name="csrf_token" value={csrfToken} />

        <label>
          {t("boxes.label_label")}
          <input
            type="text"
            name="label"
            value={box.label ?? ""}
            placeholder={t("boxes.label_placeholder")}
          />
        </label>

        <label>
          {t("boxes.destination_room_label")}
          <select name="destinationRoomId">
            <option
              value=""
              selected={box.destinationRoomId === null}
            >
              – {t("boxes.destination_room_label")} –
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
        </label>

        <button type="submit">{t("action.save")}</button>
        <a href={`/boxes/${box.id}`} class="btn-secondary">
          {t("action.cancel")}
        </a>
      </form>
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const box = await findBox(ctx.params.id);
    if (!box) return new Response(t("error.not_found"), { status: 404 });

    const rooms = await listRooms();
    return ctx.render(
      <EditBoxPage
        box={box}
        rooms={rooms}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const box = await findBox(ctx.params.id);
    if (!box) return new Response(t("error.not_found"), { status: 404 });

    const form = await ctx.req.formData();
    const label = ((form.get("label") as string | null) ?? "").trim() || null;
    const destinationRoomId =
      (form.get("destinationRoomId") as string | null) || null;

    await updateBox(box.id, { label, destinationRoomId });
    return new Response(null, {
      status: 302,
      headers: { Location: `/boxes/${box.id}` },
    });
  },
});
