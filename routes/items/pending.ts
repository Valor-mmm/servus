import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET() {
    return new Response(null, {
      status: 301,
      headers: { Location: "/items/incomplete" },
    });
  },
});
