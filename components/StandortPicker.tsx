import { t } from "@/lib/i18n/t.ts";
import type { BoxWithItemCount } from "@/lib/inventory/boxRepo.ts";
import type { Room } from "@/lib/inventory/types.ts";

interface ContainerItem {
  id: string;
  name: string;
}

interface Props {
  rooms: Room[];
  boxes: BoxWithItemCount[];
  containerItems: ContainerItem[];
  currentRoomId: string | null;
  currentBoxId: string | null;
  currentContainerId: string | null;
}

function activeMode(
  _roomId: string | null,
  boxId: string | null,
  containerId: string | null,
): "room" | "box" | "container" {
  if (containerId) return "container";
  if (boxId) return "box";
  return "room";
}

export function StandortPicker(
  {
    rooms,
    boxes,
    containerItems,
    currentRoomId,
    currentBoxId,
    currentContainerId,
  }: Props,
) {
  const mode = activeMode(currentRoomId, currentBoxId, currentContainerId);

  return (
    <fieldset class="standort-picker">
      <legend>{t("items.standort")}</legend>

      {/* Hidden radio inputs — direct children so sibling selectors work */}
      <input
        type="radio"
        id="sp-room"
        name="standort_type"
        value="room"
        class="standort-radio"
        checked={mode === "room"}
      />
      <input
        type="radio"
        id="sp-box"
        name="standort_type"
        value="box"
        class="standort-radio"
        checked={mode === "box"}
      />
      <input
        type="radio"
        id="sp-container"
        name="standort_type"
        value="container"
        class="standort-radio"
        checked={mode === "container"}
      />

      {/* Visible tab bar */}
      <div class="standort-bar">
        <label for="sp-room">{t("items.standort.room")}</label>
        <label for="sp-box">{t("items.standort.box")}</label>
        <label for="sp-container">{t("items.standort.container")}</label>
      </div>

      {/* Panels — siblings of the radio inputs */}
      <div class="standort-panel" id="sp-panel-room">
        <select name="roomId">
          <option value="">{t("items.no_room")}</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id} selected={r.id === currentRoomId}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div class="standort-panel" id="sp-panel-box">
        <select name="boxId">
          <option value="">{t("items.no_box")}</option>
          {boxes.map((b) => (
            <option key={b.id} value={b.id} selected={b.id === currentBoxId}>
              {b.code}
              {b.label ? ` – ${b.label}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div class="standort-panel" id="sp-panel-container">
        <select name="containerId">
          <option value="">{t("items.no_container")}</option>
          {containerItems.map((c) => (
            <option
              key={c.id}
              value={c.id}
              selected={c.id === currentContainerId}
            >
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

export type { ContainerItem };
