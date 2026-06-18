import { define } from "@/utils.ts";
import { getKv } from "@/lib/kv/client.ts";
import { deleteAllKv } from "@/lib/kv/deleteAll.ts";
import { isAdminUser } from "@/lib/auth/adminGuard.ts";

export const handler = define.handlers({
  async POST(ctx) {
    if (!isAdminUser(ctx.state.user?.username ?? "")) {
      return new Response(null, { status: 403 });
    }
    const kv = await getKv();
    const { deleted } = await deleteAllKv(kv);
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin?deleted=${deleted}` },
    });
  },
});
