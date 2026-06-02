import { getKv } from "@/lib/kv/client.ts";
import type { Invite } from "@/lib/invites/types.ts";

const INVITE_KEY = (id: string): Deno.KvKey => ["invite", id];
const CODE_LOOKUP_KEY = (lookup: string): Deno.KvKey => [
  "invite-by-code",
  lookup,
];
const EXPIRY_INDEX_KEY = (expiry: number, id: string): Deno.KvKey => [
  "invite-by-expiry",
  new Date(expiry).toISOString(),
  id,
];

export async function createInvite(invite: Invite): Promise<void> {
  const kv = await getKv();
  const result = await kv.atomic()
    .set(INVITE_KEY(invite.id), invite)
    .set(CODE_LOOKUP_KEY(invite.codeLookup), invite.id)
    .set(EXPIRY_INDEX_KEY(invite.expiry, invite.id), true)
    .commit();

  if (!result.ok) {
    throw new Error(`Failed to create invite ${invite.id}`);
  }
}

export async function getInviteById(id: string): Promise<Invite | null> {
  const kv = await getKv();
  const entry = await kv.get<Invite>(INVITE_KEY(id));
  return entry.value;
}

export async function getInviteByCode(
  codeLookup: string,
): Promise<Invite | null> {
  const kv = await getKv();
  const indexEntry = await kv.get<string>(CODE_LOOKUP_KEY(codeLookup));
  if (!indexEntry.value) return null;
  return getInviteById(indexEntry.value);
}

export async function listOutstandingInvites(): Promise<Invite[]> {
  const kv = await getKv();
  const now = Date.now();
  const entries = kv.list<Invite>({ prefix: ["invite"] });
  const invites: Invite[] = [];
  for await (const entry of entries) {
    if (entry.value && entry.value.expiry > now) {
      invites.push(entry.value);
    }
  }
  return invites.sort((a, b) => a.expiry - b.expiry);
}

export async function deleteInviteById(id: string): Promise<void> {
  const kv = await getKv();
  const entry = await kv.get<Invite>(INVITE_KEY(id));
  if (!entry.value) return;

  const invite = entry.value;
  await kv.atomic()
    .delete(INVITE_KEY(id))
    .delete(CODE_LOOKUP_KEY(invite.codeLookup))
    .delete(EXPIRY_INDEX_KEY(invite.expiry, id))
    .commit();
}

export async function getInviteByIdWithVersionstamp(
  id: string,
): Promise<Deno.KvEntryMaybe<Invite>> {
  const kv = await getKv();
  return kv.get<Invite>(INVITE_KEY(id));
}
