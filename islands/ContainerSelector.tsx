import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";
import type { Room } from "@/lib/inventory/types.ts";

interface ContainerItem {
  id: string;
  name: string;
  roomId: string | null;
}

interface Props {
  rooms: Room[];
  initialContainerId: string | null;
  initialContainerName: string | null;
  onContainerChange: (id: string | null, derivedRoomId: string | null) => void;
}

export default function ContainerSelector(
  { rooms, initialContainerId, initialContainerName, onContainerChange }: Props,
) {
  const selectedId = useSignal<string | null>(initialContainerId);
  const selectedName = useSignal<string | null>(initialContainerName);
  const open = useSignal(false);
  const searchQuery = useSignal("");
  const expandedRoom = useSignal<string | null>(null);
  const roomContainers = useSignal<Record<string, ContainerItem[]>>({});
  const searchResults = useSignal<ContainerItem[]>([]);
  const loading = useSignal<string | null>(null);

  async function fetchContainers(roomId: string) {
    if (roomContainers.value[roomId]) return; // cached
    loading.value = roomId;
    try {
      const r = await fetch(
        `/api/items/containers?roomId=${encodeURIComponent(roomId)}`,
      );
      const items = await r.json() as ContainerItem[];
      roomContainers.value = { ...roomContainers.value, [roomId]: items };
    } finally {
      loading.value = null;
    }
  }

  async function searchContainers(q: string) {
    if (!q.trim()) {
      searchResults.value = [];
      return;
    }
    loading.value = "search";
    try {
      const r = await fetch(
        `/api/items/containers?q=${encodeURIComponent(q)}`,
      );
      searchResults.value = await r.json() as ContainerItem[];
    } finally {
      loading.value = null;
    }
  }

  function select(item: ContainerItem) {
    selectedId.value = item.id;
    selectedName.value = item.name;
    open.value = false;
    searchQuery.value = "";
    onContainerChange(item.id, item.roomId);
  }

  function clear() {
    selectedId.value = null;
    selectedName.value = null;
    open.value = false;
    onContainerChange(null, null);
  }

  function toggleRoom(roomId: string) {
    if (expandedRoom.value === roomId) {
      expandedRoom.value = null;
    } else {
      expandedRoom.value = roomId;
      fetchContainers(roomId);
    }
  }

  function toggleNone() {
    if (expandedRoom.value === "none") {
      expandedRoom.value = null;
    } else {
      expandedRoom.value = "none";
      fetchContainers("none");
    }
  }

  const isSearching = searchQuery.value.trim().length > 0;
  const displayItems = isSearching ? searchResults.value : null;

  return (
    <div class="container-selector">
      {selectedId.value
        ? (
          <div class="container-selector-selected">
            <span>{selectedName.value}</span>
            <button
              type="button"
              class="btn-small"
              onClick={clear}
            >
              ✕
            </button>
          </div>
        )
        : (
          <button
            type="button"
            class="btn-secondary btn-small"
            onClick={() => (open.value = !open.value)}
          >
            {t("items.container_label")}
          </button>
        )}

      {open.value && (
        <div class="container-selector-panel">
          <input
            type="text"
            placeholder={t("action.search")}
            value={searchQuery.value}
            onInput={(e) => {
              const q = (e.target as HTMLInputElement).value;
              searchQuery.value = q;
              searchContainers(q);
            }}
            class="container-search"
            autofocus
          />

          {isSearching
            ? (
              <div class="container-results">
                {loading.value === "search" && <p class="loading">…</p>}
                {displayItems && displayItems.length === 0 &&
                  loading.value !== "search" && <p class="empty">–</p>}
                {displayItems && displayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    class="container-option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(item);
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )
            : (
              <div class="container-accordion">
                {rooms.map((room) => (
                  <div key={room.id} class="accordion-panel">
                    <button
                      type="button"
                      class="accordion-header"
                      onClick={() => toggleRoom(room.id)}
                    >
                      {room.name} {expandedRoom.value === room.id ? "▾" : "▸"}
                    </button>
                    {expandedRoom.value === room.id && (
                      <div class="accordion-body">
                        {loading.value === room.id && <p class="loading">…</p>}
                        {(roomContainers.value[room.id] ?? []).length === 0 &&
                          loading.value !== room.id && <p class="empty">–</p>}
                        {(roomContainers.value[room.id] ?? []).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            class="container-option"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              select(item);
                            }}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div class="accordion-panel">
                  <button
                    type="button"
                    class="accordion-header"
                    onClick={toggleNone}
                  >
                    {t("items.no_room")}{" "}
                    {expandedRoom.value === "none" ? "▾" : "▸"}
                  </button>
                  {expandedRoom.value === "none" && (
                    <div class="accordion-body">
                      {loading.value === "none" && <p class="loading">…</p>}
                      {(roomContainers.value["none"] ?? []).length === 0 &&
                        loading.value !== "none" && <p class="empty">–</p>}
                      {(roomContainers.value["none"] ?? []).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          class="container-option"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            select(item);
                          }}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
