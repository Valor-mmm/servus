import { define } from "@/utils.ts";
import { handleCreateFromPhoto } from "@/lib/inventory/createFromPhotoApi.ts";

export const handler = define.handlers({
  async POST(ctx) {
    let body: unknown;
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const result = await handleCreateFromPhoto(body);
    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ item: result.item }, { status: result.status });
  },
});
