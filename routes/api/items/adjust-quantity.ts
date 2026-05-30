import { define } from "@/utils.ts";
import { handleAdjustQuantityPost } from "@/lib/inventory/adjustQuantityApi.ts";

export const handler = define.handlers({
  async POST(ctx) {
    let body: unknown;
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "invalid" }, { status: 400 });
    }

    const result = await handleAdjustQuantityPost(body);
    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ quantity: result.quantity }, { status: 200 });
  },
});
