let _kv: Deno.Kv | undefined;

export async function getKv(): Promise<Deno.Kv> {
  if (!_kv) {
    _kv = await Deno.openKv();
  }
  return _kv;
}

/** Inject a KV instance — used in tests to swap in an in-memory store. */
export function setKv(kv: Deno.Kv): void {
  _kv = kv;
}

export async function closeKv(): Promise<void> {
  await _kv?.close();
  _kv = undefined;
}
