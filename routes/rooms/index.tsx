import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { createRoom, deleteRoom, listRooms } from "@/lib/inventory/roomRepo.ts";
import type { Room } from "@/lib/inventory/types.ts";

interface PageProps {
  rooms: Room[];
  error: string | null;
  csrfToken: string;
}

function RoomsPage({ rooms, error, csrfToken }: PageProps) {
  return (
    <main class="page">
      <h1>{t("rooms.title")}</h1>
      {error && <p class="error">{error}</p>}

      <form method="post" action="/rooms">
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input type="hidden" name="_action" value="create" />
        <label>
          {t("rooms.name_label")}
          <input
            type="text"
            name="name"
            placeholder={t("rooms.name_placeholder")}
            required
          />
        </label>
        <button type="submit">{t("rooms.add")}</button>
      </form>

      {rooms.length === 0
        ? <p class="empty">{t("rooms.empty")}</p>
        : (
          <ul class="item-list">
            {rooms.map((room) => (
              <li key={room.id} class="item-row">
                <a href={`/items?room=${room.id}`}>{room.name}</a>
                <form method="post" action="/rooms">
                  <input type="hidden" name="csrf_token" value={csrfToken} />
                  <input type="hidden" name="_action" value="delete" />
                  <input type="hidden" name="id" value={room.id} />
                  <button type="submit" class="btn-danger">
                    {t("action.delete")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    const rooms = await listRooms();
    return ctx.render(
      <RoomsPage
        rooms={rooms}
        error={null}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const action = form.get("_action") as string;
    let error: string | null = null;

    if (action === "create") {
      const name = ((form.get("name") as string | null) ?? "").trim();
      try {
        await createRoom(name);
        return new Response(null, {
          status: 302,
          headers: { Location: "/rooms" },
        });
      } catch {
        error = t("rooms.error.duplicate");
      }
    } else if (action === "delete") {
      const id = (form.get("id") as string | null) ?? "";
      try {
        await deleteRoom(id);
        return new Response(null, {
          status: 302,
          headers: { Location: "/rooms" },
        });
      } catch {
        error = t("rooms.error.in_use");
      }
    }

    const rooms = await listRooms();
    return ctx.render(
      <RoomsPage
        rooms={rooms}
        error={error}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },
});
