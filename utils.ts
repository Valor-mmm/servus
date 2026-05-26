import { createDefine } from "fresh";

export interface State {
  // Populated by auth middleware (added in M1). Null = unauthenticated.
  user?: { username: string };
}

export const define = createDefine<State>();
