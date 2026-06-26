import { define } from "@/utils.ts";
import { revokeInvite } from "@/lib/invites/index.ts";
import { requireAdmin } from "@/lib/auth/middleware.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const guard = await requireAdmin(ctx);
    if (guard) return guard;
    const id = ctx.params.id;
    await revokeInvite(id);
    return new Response(null, {
      status: 302,
      headers: { Location: "/admin" },
    });
  },
});
