import { define } from "@/utils.ts";
import { handleAppendPhoto } from "@/lib/inventory/appendPhotoApi.ts";

export const handler = define.handlers({
  async POST(ctx) {
    let body: unknown;
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const result = await handleAppendPhoto(body);
    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ item: result.item }, { status: result.status });
  },
});
