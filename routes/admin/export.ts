import { define } from "@/utils.ts";
import { getKv } from "@/lib/kv/client.ts";
import { exportKv } from "@/lib/kv/export.ts";

export const handler = define.handlers({
  async GET(_ctx) {
    const kv = await getKv();
    const date = new Date().toISOString().slice(0, 10);
    const filename = `servus-export-${date}.ndjson`;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const line of exportKv(kv)) {
            controller.enqueue(encoder.encode(line + "\n"));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  },
});
