import { assertEquals, assertMatch } from "@std/assert";
import { closeKv, setKv } from "@/lib/kv/client.ts";
import { createSession } from "@/lib/auth/sessionRepo.ts";
import { signSessionId } from "@/lib/auth/sessionCookie.ts";
import {
  applyCsrfGuard,
  applyRequireAuth,
  applySecurityHeaders,
} from "@/lib/auth/middleware.ts";
import { IDLE_TTL_MS } from "@/lib/auth/sessionRepo.ts";

async function withKv(fn: () => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    await fn();
  } finally {
    await closeKv();
  }
}

const SESSION_KEY = "c".repeat(64);

function makeReq(
  method: string,
  path: string,
  opts: { cookie?: string; csrfHeader?: string; body?: URLSearchParams } = {},
): Request {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", opts.cookie);
  if (opts.csrfHeader) headers.set("x-csrf-token", opts.csrfHeader);
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: opts.body,
  });
}

// ── requireAuth ──────────────────────────────────────────────────────────────

Deno.test("requireAuth: unauthenticated GET redirects to /login?next=...", async () => {
  await withKv(async () => {
    const req = makeReq("GET", "/items");
    const result = await applyRequireAuth(req, SESSION_KEY);
    assertEquals(result.pass, false);
    assertEquals(result.response?.status, 302);
    assertMatch(
      result.response?.headers.get("location") ?? "",
      /\/login\?next=%2Fitems/,
    );
  });
});

Deno.test("requireAuth: unauthenticated non-GET to protected route returns 401", async () => {
  await withKv(async () => {
    const req = makeReq("POST", "/items");
    const result = await applyRequireAuth(req, SESSION_KEY);
    assertEquals(result.pass, false);
    assertEquals(result.response?.status, 401);
  });
});

Deno.test("requireAuth: authenticated GET passes through and populates user", async () => {
  await withKv(async () => {
    const session = await createSession("alice", "csrf-token");
    const cookieVal = await signSessionId(session.sessionId, SESSION_KEY);
    const req = makeReq("GET", "/items", {
      cookie: `servus_session=${cookieVal}`,
    });
    const result = await applyRequireAuth(req, SESSION_KEY);
    assertEquals(result.pass, true);
    assertEquals(result.user?.username, "alice");
  });
});

Deno.test("requireAuth: public routes (login, healthz, static) pass through unauthenticated", async () => {
  await withKv(async () => {
    for (const path of ["/login", "/healthz", "/static/app.css"]) {
      const req = makeReq("GET", path);
      const result = await applyRequireAuth(req, SESSION_KEY);
      assertEquals(result.pass, true, `Expected ${path} to pass through`);
    }
  });
});

Deno.test("requireAuth: renews lastSeen when older than the throttle window", async () => {
  await withKv(async () => {
    const session = await createSession("renew-me", "csrf-token");
    // Force lastSeen to be more than the 1-hour throttle window ago.
    const kv = await import("@/lib/kv/client.ts").then((m) => m.getKv());
    const stale = Date.now() - 2 * 60 * 60 * 1000;
    await kv.set(["session", session.sessionId], {
      ...session,
      lastSeen: stale,
    });

    const cookieVal = await signSessionId(session.sessionId, SESSION_KEY);
    const req = makeReq("GET", "/items", {
      cookie: `servus_session=${cookieVal}`,
    });
    const result = await applyRequireAuth(req, SESSION_KEY);
    assertEquals(result.pass, true);

    const { findSession } = await import("@/lib/auth/sessionRepo.ts");
    const after = await findSession(session.sessionId);
    assertEquals(
      (after?.lastSeen ?? 0) > stale,
      true,
      "lastSeen should have been bumped past the stale timestamp",
    );
  });
});

Deno.test("requireAuth: does not write when lastSeen is within the throttle window", async () => {
  await withKv(async () => {
    const session = await createSession("fresh-me", "csrf-token");
    const originalLastSeen = session.lastSeen;

    const cookieVal = await signSessionId(session.sessionId, SESSION_KEY);
    const req = makeReq("GET", "/items", {
      cookie: `servus_session=${cookieVal}`,
    });
    const result = await applyRequireAuth(req, SESSION_KEY);
    assertEquals(result.pass, true);

    const { findSession } = await import("@/lib/auth/sessionRepo.ts");
    const after = await findSession(session.sessionId);
    assertEquals(after?.lastSeen, originalLastSeen);
  });
});

Deno.test("requireAuth: expired session is rejected and removed lazily", async () => {
  await withKv(async () => {
    const session = await createSession("bob", "csrf-token");
    // Force session to appear expired (lastSeen > IDLE_TTL_MS ago)
    const kv = await import("@/lib/kv/client.ts").then((m) => m.getKv());
    const expiredSession = {
      ...session,
      lastSeen: Date.now() - IDLE_TTL_MS - 1,
    };
    await kv.set(["session", session.sessionId], expiredSession);

    const cookieVal = await signSessionId(session.sessionId, SESSION_KEY);
    const req = makeReq("GET", "/items", {
      cookie: `servus_session=${cookieVal}`,
    });
    const result = await applyRequireAuth(req, SESSION_KEY);
    assertEquals(result.pass, false);
    assertEquals(result.response?.status, 302);

    // Session should be lazily deleted
    const { findSession } = await import("@/lib/auth/sessionRepo.ts");
    const gone = await findSession(session.sessionId);
    assertEquals(gone, null);
  });
});

// ── csrfGuard ─────────────────────────────────────────────────────────────────

Deno.test("csrfGuard: missing token on POST returns 403", async () => {
  await withKv(async () => {
    const session = await createSession("carol", "valid-csrf");
    const result = await applyCsrfGuard(
      makeReq("POST", "/items"),
      session.csrfToken,
    );
    assertEquals(result.pass, false);
    assertEquals(result.response?.status, 403);
  });
});

Deno.test("csrfGuard: wrong token on POST returns 403", async () => {
  await withKv(async () => {
    const session = await createSession("dave", "valid-csrf");
    const req = makeReq("POST", "/items", { csrfHeader: "wrong-token" });
    const result = await applyCsrfGuard(req, session.csrfToken);
    assertEquals(result.pass, false);
    assertEquals(result.response?.status, 403);
  });
});

Deno.test("csrfGuard: correct token passes", async () => {
  const session = await (async () => {
    const kv = await Deno.openKv(":memory:");
    setKv(kv);
    const s = await createSession("eve", "valid-csrf");
    await closeKv();
    return s;
  })();
  const req = makeReq("POST", "/items", { csrfHeader: "valid-csrf" });
  const result = await applyCsrfGuard(req, session.csrfToken);
  assertEquals(result.pass, true);
});

Deno.test("csrfGuard: GET requests pass without token", async () => {
  const req = makeReq("GET", "/items");
  const result = await applyCsrfGuard(req, "any-token");
  assertEquals(result.pass, true);
});

// ── securityHeaders ───────────────────────────────────────────────────────────

Deno.test("securityHeaders: adds required headers to a response", () => {
  const response = new Response("ok");
  const result = applySecurityHeaders(response);
  assertEquals(
    result.headers.get("strict-transport-security"),
    "max-age=31536000; includeSubDomains",
  );
  assertEquals(result.headers.get("x-content-type-options"), "nosniff");
  assertEquals(result.headers.get("referrer-policy"), "same-origin");
  const csp = result.headers.get("content-security-policy") ?? "";
  assertEquals(csp.includes("default-src 'self'"), true);
  assertEquals(csp.includes("frame-ancestors 'none'"), true);
  assertEquals(csp.includes("form-action 'self'"), true);
  const pp = result.headers.get("permissions-policy") ?? "";
  assertEquals(pp.includes("geolocation=()"), true);
  assertEquals(pp.includes("microphone=()"), true);
  // media-src must be present so capture input doesn't trigger violations
  assertEquals(csp.includes("media-src"), true);
});

Deno.test("securityHeaders: nonce replaces unsafe-inline in script-src", () => {
  const response = new Response("ok");
  const result = applySecurityHeaders(response, "abc123");
  const csp = result.headers.get("content-security-policy") ?? "";
  assertEquals(csp.includes("'nonce-abc123'"), true);
  // unsafe-inline must NOT appear in script-src alongside a nonce (browsers
  // ignore it and warn; style-src still uses it which is fine)
  const scriptSrcDirective =
    csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
  assertEquals(scriptSrcDirective.includes("'unsafe-inline'"), false);
  assertEquals(result.headers.get("cache-control"), "no-store");
});

Deno.test("securityHeaders: no nonce → unsafe-inline used, no Cache-Control override", () => {
  const response = new Response("ok");
  const result = applySecurityHeaders(response);
  const csp = result.headers.get("content-security-policy") ?? "";
  assertEquals(csp.includes("'unsafe-inline'"), true);
  assertEquals(csp.includes("nonce"), false);
  assertEquals(result.headers.get("cache-control"), null);
});
