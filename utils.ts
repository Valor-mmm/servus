import { createDefine } from "fresh";

export interface State {
  user?: { username: string };
  csrfToken?: string;
}

export const define = createDefine<State>();
