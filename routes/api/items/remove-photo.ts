import { define } from "@/utils.ts";
import { handleRemovePhoto } from "@/lib/inventory/removePhotoApi.ts";
import { getR2Config } from "@/lib/photos/config.ts";

export const handler = define.handlers({
  async POST(ctx) {
    let body: unknown;
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    let r2cfg = null;
    try {
      r2cfg = getR2Config();
    } catch {
      // R2 not configured — photo bytes won't be deleted but the item update proceeds
    }

    const result = await handleRemovePhoto(body, r2cfg);
    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ item: result.item }, { status: result.status });
  },
});
