import { define } from "@/utils.ts";
import { requireAdmin } from "@/lib/auth/middleware.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const guard = await requireAdmin(ctx);
    if (guard) return guard;
    return new Response(null, {
      status: 302,
      headers: { Location: "/admin" },
    });
  },
  async POST(ctx) {
    const guard = await requireAdmin(ctx);
    if (guard) return guard;
    return new Response(null, {
      status: 302,
      headers: { Location: "/admin" },
    });
  },
});
