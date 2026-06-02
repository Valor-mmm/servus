export interface Invite {
  id: string;
  hashedCode: string;
  codeLookup: string;
  expiry: number;
  createdAt: number;
}

export interface InviteCodePair {
  rawCode: string;
  invite: Invite;
}

export type ConsumeResult =
  | { ok: true; cookie: string; csrfToken: string }
  | { ok: false; reason: "not_found" };
