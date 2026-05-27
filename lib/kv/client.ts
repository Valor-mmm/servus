let _kv: Deno.Kv | undefined;

export async function getKv(): Promise<Deno.Kv> {
  if (!_kv) {
    // DENO_KV_PATH allows E2E tests to use ":memory:" to avoid state bleed
    const path = Deno.env.get("DENO_KV_PATH");
    _kv = path !== undefined ? await Deno.openKv(path) : await Deno.openKv();
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
