import { define } from "@/utils.ts";
import { handleLogoutPost } from "@/lib/auth/logoutHandler.ts";
import { COOKIE_NAME, verifySessionCookie } from "@/lib/auth/sessionCookie.ts";
import { findSession } from "@/lib/auth/sessionRepo.ts";

const SESSION_KEY = () => Deno.env.get("SERVUS_SESSION_KEY") ?? "";

export const handler = define.handlers({
  async POST(ctx) {
    const cookieHeader = ctx.req.headers.get("cookie") ?? "";
    const cookieValue = parseCookie(cookieHeader, COOKIE_NAME);
    const sessionId = cookieValue
      ? await verifySessionCookie(cookieValue, SESSION_KEY())
      : null;

    if (!sessionId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    // Derive username from the session record (logout is a public route)
    const session = await findSession(sessionId);
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    const form = await ctx.req.formData();
    const csrfToken = (form.get("csrf_token") as string | null) ??
      ctx.req.headers.get("x-csrf-token") ?? "";

    const result = await handleLogoutPost({
      sessionId,
      username: session.username,
      csrfToken,
    });

    if (!result.success) {
      return new Response(null, { status: 403 });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/login",
        "Set-Cookie": result.clearCookie!,
      },
    });
  },
});

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k.trim() === name) return v.join("=").trim();
  }
  return null;
}
