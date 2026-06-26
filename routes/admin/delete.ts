import { define } from "@/utils.ts";
import { getKv } from "@/lib/kv/client.ts";
import { deleteAllKv } from "@/lib/kv/deleteAll.ts";
import { requireAdmin } from "@/lib/auth/middleware.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const guard = await requireAdmin(ctx);
    if (guard) return guard;
    const kv = await getKv();
    const { deleted } = await deleteAllKv(kv);
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin?deleted=${deleted}` },
    });
  },
});
