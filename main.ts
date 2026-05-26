import { App, staticFiles } from "fresh";
import { type State } from "./utils.ts";

export const app = new App<State>();

app.use(staticFiles());

// Auth middleware, CSRF guard, and security headers are added in M1.

app.fsRoutes();
