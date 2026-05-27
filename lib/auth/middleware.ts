import type { FreshContext } from "fresh";
import { type State } from "@/utils.ts";
import { COOKIE_NAME, verifySessionCookie } from "@/lib/auth/sessionCookie.ts";
import {
  deleteSession,
  findSession,
  IDLE_TTL_MS,
} from "@/lib/auth/sessionRepo.ts";
import { verifyCsrfToken } from "@/lib/auth/csrf.ts";

const PUBLIC_PATHS = new Set(["/login", "/logout", "/healthz"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/static/")) return true;
  return false;
}

function parseCookieHeader(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k.trim() === name) return v.join("=").trim();
  }
  return null;
}

// ── Pure helper functions (used in tests and middleware) ──────────────────────

export interface MiddlewareResult {
  pass: boolean;
  response?: Response;
  user?: { username: string };
}

export async function applyRequireAuth(
  req: Request,
  sessionKey: string,
): Promise<MiddlewareResult> {
  const url = new URL(req.url);
  if (isPublic(url.pathname)) return { pass: true };

  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieValue = parseCookieHeader(cookieHeader, COOKIE_NAME);
  const sessionId = cookieValue
    ? await verifySessionCookie(cookieValue, sessionKey)
    : null;

  if (!sessionId) {
    if (req.method === "GET") {
      const next = encodeURIComponent(url.pathname + url.search);
      return {
        pass: false,
        response: new Response(null, {
          status: 302,
          headers: { Location: `/login?next=${next}` },
        }),
      };
    }
    return { pass: false, response: new Response(null, { status: 401 }) };
  }

  const session = await findSession(sessionId);
  if (!session) {
    if (req.method === "GET") {
      const next = encodeURIComponent(url.pathname + url.search);
      return {
        pass: false,
        response: new Response(null, {
          status: 302,
          headers: { Location: `/login?next=${next}` },
        }),
      };
    }
    return { pass: false, response: new Response(null, { status: 401 }) };
  }

  // Check idle timeout — lazy expiry on access
  if (Date.now() - session.lastSeen > IDLE_TTL_MS) {
    await deleteSession(session.sessionId, session.username);
    if (req.method === "GET") {
      const next = encodeURIComponent(url.pathname + url.search);
      return {
        pass: false,
        response: new Response(null, {
          status: 302,
          headers: { Location: `/login?next=${next}` },
        }),
      };
    }
    return { pass: false, response: new Response(null, { status: 401 }) };
  }

  return { pass: true, user: { username: session.username } };
}

export async function applyCsrfGuard(
  req: Request,
  sessionCsrfToken: string,
): Promise<MiddlewareResult> {
  const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  if (!MUTATION_METHODS.has(req.method)) return { pass: true };

  const headerToken = req.headers.get("x-csrf-token") ?? "";

  // Also check form body if no header token
  let token = headerToken;
  if (!token) {
    try {
      const cloned = req.clone();
      const form = await cloned.formData();
      token = (form.get("csrf_token") as string | null) ?? "";
    } catch {
      // non-form body, token stays empty
    }
  }

  if (!verifyCsrfToken(token, sessionCsrfToken)) {
    return { pass: false, response: new Response(null, { status: 403 }) };
  }
  return { pass: true };
}

export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "same-origin");
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
  );
  headers.set(
    "Permissions-Policy",
    "camera=(self), geolocation=(), microphone=()",
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── Fresh middleware factory functions ────────────────────────────────────────

const SESSION_KEY = () => Deno.env.get("SERVUS_SESSION_KEY") ?? "";

type Handler = (
  ctx: FreshContext<State>,
) => Promise<Response> | Response;

export function securityHeaders(): Handler {
  return async (ctx) => {
    const response = await ctx.next();
    return applySecurityHeaders(response);
  };
}

export function requireAuth(): Handler {
  return async (ctx) => {
    const result = await applyRequireAuth(ctx.req, SESSION_KEY());
    if (!result.pass) return result.response!;
    if (result.user) {
      ctx.state.user = result.user;
      // Populate csrfToken in state for layout meta tag rendering
      const cookieHeader = ctx.req.headers.get("cookie") ?? "";
      const cookieValue = parseCookieHeader(cookieHeader, COOKIE_NAME);
      const sessionId = cookieValue
        ? await verifySessionCookie(cookieValue, SESSION_KEY())
        : null;
      if (sessionId) {
        const session = await findSession(sessionId);
        if (session) ctx.state.csrfToken = session.csrfToken;
      }
    }
    return ctx.next();
  };
}

export function csrfGuard(): Handler {
  return async (ctx) => {
    // Only guard if we have an authenticated session
    if (!ctx.state.user) return ctx.next();

    // Find the session to get the CSRF token
    const cookieHeader = ctx.req.headers.get("cookie") ?? "";
    const cookieValue = parseCookieHeader(cookieHeader, COOKIE_NAME);
    const sessionId = cookieValue
      ? await verifySessionCookie(cookieValue, SESSION_KEY())
      : null;

    if (!sessionId) return ctx.next();

    const session = await findSession(sessionId);
    if (!session) return ctx.next();

    const result = await applyCsrfGuard(ctx.req, session.csrfToken);
    if (!result.pass) return result.response!;
    return ctx.next();
  };
}
