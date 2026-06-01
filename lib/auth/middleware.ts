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

export function applySecurityHeaders(
  response: Response,
  cspNonce?: string,
): Response {
  const headers = new Headers(response.headers);

  headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "same-origin");

  // Include R2 host in connect-src (for presigned PUT uploads) and img-src
  // (for presigned GET thumbnails) when the bucket is configured.
  // Trailing slash makes CSP treat this as a path prefix, matching any object
  // key under the bucket (e.g. /bucket/key?sig…) not just the bare bucket URL.
  const r2Base = Deno.env.get("R2_PUBLIC_URL") ?? "";
  const r2Src = r2Base ? r2Base.replace(/\/*$/, "/") : "";
  // Fresh 2 puts a per-request nonce on its <script type="module"> boot tag.
  // 'unsafe-inline' is ignored by browsers when a nonce-source is present, so
  // we only emit it on pages without islands (no nonce) as a fallback.
  const scriptSrc = cspNonce
    ? `script-src 'self' 'nonce-${cspNonce}'`
    : `script-src 'self' 'unsafe-inline'`;
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `img-src 'self' data: blob:${r2Src ? ` ${r2Src}` : ""}`,
      "style-src 'self' 'unsafe-inline'",
      scriptSrc,
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      `connect-src 'self'${r2Src ? ` ${r2Src}` : ""}`,
      // media-src covers <video>/<audio>; camera capture on some browsers
      // checks this directive even for <input capture="environment">.
      "media-src 'self' data: blob:",
    ].join("; "),
  );
  // Prevent CDN/edge caches from storing HTML and serving a stale nonce that
  // no longer matches the nonce in the response body.
  if (cspNonce) {
    headers.set("Cache-Control", "no-store");
  }
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

    // Fresh puts a per-request nonce on <script type="module"> tags but doesn't
    // expose it via the context. Buffer HTML responses to extract it and
    // include it in script-src so browsers honour the nonce-carrying scripts.
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") || response.body === null) {
      return applySecurityHeaders(response);
    }

    const body = await response.text();
    const nonceMatch = body.match(/\snonce="([0-9a-f]{20,})"/);
    const nonce = nonceMatch?.[1];

    return applySecurityHeaders(
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }),
      nonce,
    );
  };
}

export function requireAuth(): Handler {
  return async (ctx) => {
    const result = await applyRequireAuth(ctx.req, SESSION_KEY());
    if (!result.pass) {
      return result.response!;
    }
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
