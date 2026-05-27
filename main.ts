import { App, staticFiles } from "fresh";
import { type State } from "./utils.ts";
import { seedFromEnv } from "@/lib/auth/seed.ts";
import {
  csrfGuard,
  requireAuth,
  securityHeaders,
} from "@/lib/auth/middleware.ts";

export const app = new App<State>();

app.use(staticFiles());
app.use(securityHeaders());
app.use(requireAuth());
app.use(csrfGuard());

app.fsRoutes();

await seedFromEnv();
