import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { computeLookup } from "@/lib/invites/generate.ts";
import { consumeInvite } from "@/lib/invites/index.ts";
import { getInviteByCode } from "@/lib/invites/kv.ts";
import { checkAndIncrementInviteIp } from "@/lib/invites/rateLimit.ts";
import { COOKIE_NAME, verifySessionCookie } from "@/lib/auth/sessionCookie.ts";
import { findSession } from "@/lib/auth/sessionRepo.ts";

const SESSION_KEY = () => Deno.env.get("SERVUS_SESSION_KEY") ?? "";

async function isLoggedIn(req: Request): Promise<boolean> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k.trim() === COOKIE_NAME) {
      const sessionId = await verifySessionCookie(v.join("=").trim(), SESSION_KEY());
      if (sessionId) {
        const session = await findSession(sessionId);
        return session !== null;
      }
    }
  }
  return false;
}

function formatExpiry(ms: number): string {
  return new Date(ms).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function AlreadyLoggedInPage() {
  return (
    <main class="auth-page">
      <h1>{t("invite.title")}</h1>
      <p class="error">{t("invite.already_logged_in")}</p>
      <a href="/" class="btn-secondary">{t("action.back")}</a>
    </main>
  );
}

function ConfirmPage(
  { code, expiry }: { code: string; expiry: number },
) {
  return (
    <main class="auth-page">
      <p class="invite-app-context">{t("invite.app_context")}</p>
      <h1>{t("invite.title")}</h1>
      <p>{t("invite.access_context")}</p>
      <p class="invite-expiry">
        {t("invite.expiry_context", { expiry: formatExpiry(expiry) })}
      </p>
      <p>{t("invite.confirm_subtitle")}</p>
      <form method="post" action={`/invite/${code}`}>
        <button type="submit">{t("invite.confirm")}</button>
      </form>
    </main>
  );
}

function InvalidInvitePage() {
  return (
    <main class="auth-page">
      <p class="error">{t("invite.error.invalid")}</p>
    </main>
  );
}

function RateLimitedPage({ seconds }: { seconds: number }) {
  return (
    <main class="auth-page">
      <p class="error">
        {t("invite.error.rate_limited", { seconds: String(seconds) })}
      </p>
    </main>
  );
}

export const handler = define.handlers({
  async GET(ctx) {
    // Block logged-in users — consuming a single-use code silently would be wrong.
    // The invite route is public (skipped by auth middleware), so we check the
    // session directly rather than relying on ctx.state.user.
    if (await isLoggedIn(ctx.req)) {
      return ctx.render(<AlreadyLoggedInPage />);
    }

    const code = ctx.params.code;
    const ip = ctx.req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";

    const rateLimitResult = await checkAndIncrementInviteIp(ip, SESSION_KEY());
    if (rateLimitResult.limited) {
      const secs = rateLimitResult.retryAfterSeconds ?? 60;
      return ctx.render(<RateLimitedPage seconds={secs} />);
    }

    const lookup = await computeLookup(code);
    const invite = await getInviteByCode(lookup);

    if (!invite || invite.expiry <= Date.now()) {
      return ctx.render(<InvalidInvitePage />);
    }

    return ctx.render(<ConfirmPage code={code} expiry={invite.expiry} />);
  },

  async POST(ctx) {
    // Block logged-in users from consuming the code via POST too
    if (await isLoggedIn(ctx.req)) {
      return ctx.render(<AlreadyLoggedInPage />);
    }

    const code = ctx.params.code;
    const ip = ctx.req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";

    const rateLimitResult = await checkAndIncrementInviteIp(ip, SESSION_KEY());
    if (rateLimitResult.limited) {
      const secs = rateLimitResult.retryAfterSeconds ?? 60;
      return ctx.render(<RateLimitedPage seconds={secs} />);
    }

    const result = await consumeInvite(code, SESSION_KEY());

    if (!result.ok) {
      return ctx.render(<InvalidInvitePage />);
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: "/",
        "Set-Cookie": result.cookie,
      },
    });
  },
});
