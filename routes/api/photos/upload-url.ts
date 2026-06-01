import { define } from "@/utils.ts";
import { getR2Config } from "@/lib/photos/config.ts";
import { handleUploadUrl } from "@/lib/photos/uploadUrlApi.ts";

export const handler = define.handlers({
  async POST(ctx) {
    let body: unknown;
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    let r2cfg;
    try {
      r2cfg = getR2Config();
    } catch (err) {
      console.error("[upload-url] R2 not configured:", err);
      return Response.json({ error: "storage not configured" }, {
        status: 503,
      });
    }

    const result = handleUploadUrl(body, r2cfg);
    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ key: result.key, url: result.url }, { status: 200 });
  },
});
