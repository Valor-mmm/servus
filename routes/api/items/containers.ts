import { define } from "@/utils.ts";
import { listItems, listItemsByRoom } from "@/lib/inventory/itemRepo.ts";
import { listCategories } from "@/lib/inventory/categoryRepo.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const roomId = ctx.url.searchParams.get("roomId");
    const q = ctx.url.searchParams.get("q")?.trim().toLowerCase() ?? "";

    const categories = await listCategories();
    const containerCatIds = new Set(
      categories.filter((c) => c.canContain).map((c) => c.id),
    );

    let items: import("@/lib/inventory/types.ts").Item[];
    if (q) {
      // Search across all items, then filter to container-capable and matching name
      items = (await listItems()).filter(
        (item) =>
          item.categoryId !== null &&
          containerCatIds.has(item.categoryId) &&
          item.name.toLowerCase().includes(q),
      );
    } else if (roomId === "none") {
      // Items with no room (roomId=null, no containerId — these are root items)
      items = (await listItems()).filter(
        (item) =>
          item.categoryId !== null &&
          containerCatIds.has(item.categoryId) &&
          item.roomId === null &&
          item.containerId === null,
      );
    } else if (roomId) {
      items = (await listItemsByRoom(roomId)).filter(
        (item) =>
          item.categoryId !== null &&
          containerCatIds.has(item.categoryId),
      );
    } else {
      items = [];
    }

    return new Response(JSON.stringify(items), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
