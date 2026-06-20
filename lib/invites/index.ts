import { argon2Verify } from "hash-wasm";
import { hashPassword } from "@/lib/auth/password.ts";
import { generateCsrfToken } from "@/lib/auth/csrf.ts";
import { COOKIE_NAME, signSessionId } from "@/lib/auth/sessionCookie.ts";
import { ABSOLUTE_TTL_SECONDS, createSession } from "@/lib/auth/sessionRepo.ts";
import { getKv } from "@/lib/kv/client.ts";
import { computeLookup, generateInviteCode } from "@/lib/invites/generate.ts";
import {
  createInvite,
  deleteInviteById,
  getInviteByCode,
  listOutstandingInvites,
} from "@/lib/invites/kv.ts";
import type {
  ConsumeResult,
  Invite,
  InviteCodePair,
} from "@/lib/invites/types.ts";

export { listOutstandingInvites };

function generateHelperUsername(): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return "helper-" + Array.from(bytes, (b) => alphabet[b % 36]).join("");
}

export async function mintInvite(expireDays: number): Promise<InviteCodePair> {
  const { rawCode, hashedCode, codeLookup } = await generateInviteCode();
  const now = Date.now();
  const invite: Invite = {
    id: crypto.randomUUID(),
    hashedCode,
    codeLookup,
    expiry: now + expireDays * 24 * 60 * 60 * 1000,
    createdAt: now,
  };
  await createInvite(invite);
  return { rawCode, invite };
}

export async function revokeInvite(id: string): Promise<void> {
  await deleteInviteById(id);
}

export async function consumeInvite(
  rawCode: string,
  sessionKey: string,
): Promise<ConsumeResult> {
  const lookup = await computeLookup(rawCode);
  const invite = await getInviteByCode(lookup);

  if (!invite || invite.expiry <= Date.now()) {
    return { ok: false, reason: "not_found" };
  }

  const codeValid = await argon2Verify({
    hash: invite.hashedCode,
    password: rawCode,
  });
  if (!codeValid) {
    return { ok: false, reason: "not_found" };
  }

  const username = generateHelperUsername();
  const passwordHash = await hashPassword(crypto.randomUUID());
  const kv = await getKv();
  const inviteKey: Deno.KvKey = ["invite", invite.id];
  const userKey: Deno.KvKey = ["user", username];

  const inviteEntry = await kv.get<Invite>(inviteKey);
  if (!inviteEntry.value) {
    return { ok: false, reason: "not_found" };
  }

  const codeLookupKey: Deno.KvKey = ["invite-by-code", invite.codeLookup];
  const expiryIndexKey: Deno.KvKey = [
    "invite-by-expiry",
    new Date(invite.expiry).toISOString(),
    invite.id,
  ];

  const result = await kv.atomic()
    .check({ key: inviteKey, versionstamp: inviteEntry.versionstamp })
    .check({ key: userKey, versionstamp: null })
    .set(userKey, {
      username,
      passwordHash,
      createdAt: Date.now(),
      role: "user",
    })
    .delete(inviteKey)
    .delete(codeLookupKey)
    .delete(expiryIndexKey)
    .commit();

  if (!result.ok) {
    return { ok: false, reason: "not_found" };
  }

  const csrfToken = generateCsrfToken();
  const session = await createSession(username, csrfToken, "user");
  const cookieValue = await signSessionId(session.sessionId, sessionKey);
  const cookie = [
    `${COOKIE_NAME}=${cookieValue}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${ABSOLUTE_TTL_SECONDS}`,
  ].join("; ");

  return { ok: true, cookie, csrfToken };
}
