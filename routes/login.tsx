import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { handleLoginPost } from "@/lib/auth/loginHandler.ts";

const SESSION_KEY = () => Deno.env.get("SERVUS_SESSION_KEY") ?? "";

interface LoginFormProps {
  error: string | null;
  next: string;
  username?: string;
}

function LoginForm({ error, next, username }: LoginFormProps) {
  return (
    <main class="auth-page">
      <h1>{t("app.name")}</h1>
      {error && <p class="error">{error}</p>}
      <form method="post" action="/login">
        {next && <input type="hidden" name="next" value={next} />}
        <label>
          {t("auth.username")}
          <input
            type="text"
            name="username"
            value={username ?? ""}
            autocomplete="username"
            required
          />
        </label>
        <label>
          {t("auth.password")}
          <input
            type="password"
            name="password"
            autocomplete="current-password"
            required
          />
        </label>
        <button type="submit">{t("auth.login")}</button>
      </form>
    </main>
  );
}

export const handler = define.handlers({
  GET(ctx) {
    if (ctx.state.user) {
      return new Response(null, {
        status: 302,
        headers: { Location: ctx.url.searchParams.get("next") ?? "/" },
      });
    }
    const next = ctx.url.searchParams.get("next") ?? "";
    return ctx.render(<LoginForm error={null} next={next} />);
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const username = (form.get("username") as string | null) ?? "";
    const password = (form.get("password") as string | null) ?? "";
    const next = (form.get("next") as string | null) ?? "/";
    const ip = ctx.req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";

    const result = await handleLoginPost(
      { username, password, ip },
      SESSION_KEY(),
    );

    if (result.limited) {
      const secs = result.retryAfterSeconds ?? 60;
      return ctx.render(
        <LoginForm
          error={t("auth.rate_limited", { seconds: String(secs) })}
          next={next}
          username={username}
        />,
        { status: 429, headers: { "Retry-After": String(secs) } },
      );
    }

    if (!result.success) {
      return ctx.render(
        <LoginForm
          error={t("auth.login_error")}
          next={next}
          username={username}
        />,
      );
    }

    const safe = next.startsWith("/") ? next : "/";
    return new Response(null, {
      status: 302,
      headers: {
        Location: safe,
        "Set-Cookie": result.cookie!,
      },
    });
  },
});

// No default export needed — handler calls ctx.render() directly
