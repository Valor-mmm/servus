import { define } from "@/utils.ts";
import { getKv } from "@/lib/kv/client.ts";
import { importKv } from "@/lib/kv/import.ts";
import { requireAdmin } from "@/lib/auth/middleware.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const guard = await requireAdmin(ctx);
    if (guard) return guard;
    let form: FormData;
    try {
      form = await ctx.req.formData();
    } catch {
      return new Response(null, {
        status: 302,
        headers: { Location: "/admin?error=Ung%C3%BCltiges+Formular" },
      });
    }

    const file = form.get("file");
    if (!file || !(file instanceof File) || file.size === 0) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/admin?error=Keine+Datei+ausgew%C3%A4hlt" },
      });
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      return new Response(null, {
        status: 302,
        headers: { Location: "/admin?error=Datei+konnte+nicht+gelesen+werden" },
      });
    }

    async function* lines(): AsyncGenerator<string> {
      for (const line of text.split("\n")) {
        yield line;
      }
    }

    try {
      const kv = await getKv();
      const { imported, skipped } = await importKv(kv, lines());
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/admin?imported=${imported}&skipped=${skipped}`,
        },
      });
    } catch (err) {
      const msg = encodeURIComponent(
        err instanceof Error ? err.message : "Unbekannter Fehler",
      );
      return new Response(null, {
        status: 302,
        headers: { Location: `/admin?error=${msg}` },
      });
    }
  },
});
