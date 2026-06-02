import { define } from "@/utils.ts";
import { revokeInvite } from "@/lib/invites/index.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const id = ctx.params.id;
    await revokeInvite(id);
    return new Response(null, {
      status: 302,
      headers: { Location: "/admin/invites" },
    });
  },
});
