import { define } from "@/utils.ts";
import { getKv } from "@/lib/kv/client.ts";
import { deleteAllKv } from "@/lib/kv/deleteAll.ts";

export const handler = define.handlers({
  async POST(_ctx) {
    const kv = await getKv();
    const { deleted } = await deleteAllKv(kv);
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin?deleted=${deleted}` },
    });
  },
});
