import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { computeLookup } from "@/lib/invites/generate.ts";
import { consumeInvite } from "@/lib/invites/index.ts";
import { getInviteByCode } from "@/lib/invites/kv.ts";
import { checkAndIncrementInviteIp } from "@/lib/invites/rateLimit.ts";

const SESSION_KEY = () => Deno.env.get("SERVUS_SESSION_KEY") ?? "";

function ConfirmPage({ code }: { code: string }) {
  return (
    <main class="auth-page">
      <h1>{t("invite.title")}</h1>
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

    return ctx.render(<ConfirmPage code={code} />);
  },

  async POST(ctx) {
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
