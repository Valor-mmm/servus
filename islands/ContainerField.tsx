import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";
import type { Room } from "@/lib/inventory/types.ts";
import ContainerSelector from "./ContainerSelector.tsx";

interface Props {
  rooms: Room[];
  initialContainerId: string | null;
  initialContainerName: string | null;
  initialRoomId: string | null;
  /** Current derived room name from container (if any) */
  initialDerivedRoomName: string | null;
}

export default function ContainerField(
  {
    rooms,
    initialContainerId,
    initialContainerName,
    initialRoomId,
    initialDerivedRoomName,
  }: Props,
) {
  const containerId = useSignal<string | null>(initialContainerId);
  const derivedRoomName = useSignal<string | null>(initialDerivedRoomName);
  const roomId = useSignal<string | null>(
    initialContainerId ? null : initialRoomId,
  );

  function handleContainerChange(
    id: string | null,
    newDerivedRoomId: string | null,
  ) {
    containerId.value = id;
    if (id) {
      // Lock room: derive from container
      const room = rooms.find((r) => r.id === newDerivedRoomId);
      derivedRoomName.value = room?.name ?? null;
      roomId.value = null;
    } else {
      // Unlock room, empty
      derivedRoomName.value = null;
      roomId.value = null;
    }
  }

  const roomLocked = containerId.value !== null;

  return (
    <div class="container-field">
      <input
        type="hidden"
        name="containerId"
        value={containerId.value ?? ""}
      />

      <ContainerSelector
        rooms={rooms}
        initialContainerId={initialContainerId}
        initialContainerName={initialContainerName}
        onContainerChange={handleContainerChange}
      />

      <label class={roomLocked ? "field-locked" : ""}>
        {t("items.room_label")}
        {roomLocked
          ? (
            <>
              <input type="hidden" name="roomId" value="" />
              <span class="field-readonly">
                {derivedRoomName.value ?? t("items.no_room")}
                <small class="field-hint">
                  {t("items.container_derived_room_hint")}
                </small>
              </span>
            </>
          )
          : (
            <select
              name="roomId"
              value={roomId.value ?? ""}
              onChange={(e) => {
                roomId.value = (e.target as HTMLSelectElement).value || null;
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
    </div>
  );
}
