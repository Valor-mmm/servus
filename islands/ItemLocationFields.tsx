/**
 * Manages the container/room/box assignment section of item forms.
 * Enforces mutual exclusion: selecting a container clears box and locks room;
 * selecting a box clears container and unlocks room.
 */
import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";
import type { Room } from "@/lib/inventory/types.ts";
import ContainerSelector from "./ContainerSelector.tsx";

interface BoxOption {
  id: string;
  code: string;
  label: string | null;
}

interface Props {
  rooms: Room[];
  boxes: BoxOption[];
  initialContainerId: string | null;
  initialContainerName: string | null;
  initialRoomId: string | null;
  initialBoxId: string | null;
  initialDerivedRoomId: string | null;
}

export default function ItemLocationFields(
  {
    rooms,
    boxes,
    initialContainerId,
    initialContainerName,
    initialRoomId,
    initialBoxId,
    initialDerivedRoomId,
  }: Props,
) {
  const containerId = useSignal<string | null>(initialContainerId);
  const roomId = useSignal<string | null>(
    initialContainerId ? null : initialRoomId,
  );
  const boxId = useSignal<string | null>(
    initialContainerId ? null : initialBoxId,
  );
  const derivedRoomId = useSignal<string | null>(initialDerivedRoomId);

  const derivedRoomName = derivedRoomId.value
    ? (rooms.find((r) => r.id === derivedRoomId.value)?.name ?? null)
    : null;

  function onContainerChange(
    id: string | null,
    newDerivedRoomId: string | null,
  ) {
    containerId.value = id;
    if (id) {
      boxId.value = null;
      roomId.value = null;
      derivedRoomId.value = newDerivedRoomId;
    } else {
      derivedRoomId.value = null;
      // room stays empty per spec; user must re-assign
    }
  }

  const roomLocked = containerId.value !== null;
  const containerLocked = boxId.value !== null;

  return (
    <div class="item-location-fields">
      <input type="hidden" name="containerId" value={containerId.value ?? ""} />

      {!containerLocked && (
        <div class="form-field">
          <span class="field-heading">{t("items.container_label")}</span>
          <ContainerSelector
            rooms={rooms}
            initialContainerId={initialContainerId}
            initialContainerName={initialContainerName}
            onContainerChange={onContainerChange}
          />
        </div>
      )}

      <label class={roomLocked ? "field-locked" : ""}>
        {t("items.room_label")}
        {roomLocked
          ? (
            <>
              <input type="hidden" name="roomId" value="" />
              <span class="field-readonly">
                {derivedRoomName ?? t("items.no_room")}
              </span>
              <small class="field-hint">
                {t("items.container_derived_room_hint")}
              </small>
            </>
          )
          : (
            <select
              name="roomId"
              value={roomId.value ?? ""}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value || null;
                roomId.value = v;
                if (v) {
                  // selecting a room is compatible with container (both null at this point)
                  // boxId also stays since selecting room doesn't clear box
                }
              }}
            >
              <option value="">{t("items.no_room")}</option>
              {rooms.map((r) => (
                <option
                  key={r.id}
                  value={r.id}
                  selected={r.id === roomId.value}
                >
                  {r.name}
                </option>
              ))}
            </select>
          )}
      </label>

      <label class={roomLocked ? "field-disabled" : ""}>
        {t("items.box_label")}
        <select
          name="boxId"
          disabled={roomLocked}
          value={boxId.value ?? ""}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value || null;
            boxId.value = v;
            if (v) {
              roomId.value = null; // selecting box clears room per existing mutual exclusion
            }
          }}
        >
          <option value="">{t("items.no_box")}</option>
          {boxes.map((b) => (
            <option
              key={b.id}
              value={b.id}
              selected={b.id === boxId.value}
            >
              {b.code}
              {b.label ? ` – ${b.label}` : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
