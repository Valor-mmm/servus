import { App, staticFiles } from "fresh";
import { type State } from "./utils.ts";
import { seedFromEnv } from "@/lib/auth/seed.ts";
import {
  csrfGuard,
  requireAuth,
  securityHeaders,
} from "@/lib/auth/middleware.ts";

const sessionKey = Deno.env.get("SERVUS_SESSION_KEY") ?? "";
if (!sessionKey || sessionKey.startsWith("REPLACE_")) {
  console.error(
    "[startup] SERVUS_SESSION_KEY is not set. Copy .env.example to .env and fill in the values.",
  );
  Deno.exit(1);
}

export const app = new App<State>();

app.use(staticFiles());
app.use(securityHeaders());
app.use(requireAuth());
app.use(csrfGuard());

app.fsRoutes();

await seedFromEnv();
