import { createDefine } from "fresh";

export interface State {
  user?: { username: string; role?: "admin" | "user" };
  csrfToken?: string;
}

export const define = createDefine<State>();
