let _kv: Deno.Kv | undefined;

export async function getKv(): Promise<Deno.Kv> {
  if (!_kv) {
    // On Deno Deploy, always use cloud KV regardless of DENO_KV_PATH.
    // DENO_KV_PATH is only for local tests (":memory:"). If it were
    // forwarded to the deployment it would silently use an ephemeral
    // in-process store that vanishes on every cold start.
    const isDeployment = Boolean(Deno.env.get("DENO_DEPLOYMENT_ID"));
    const envPath = Deno.env.get("DENO_KV_PATH");
    if (isDeployment && envPath !== undefined) {
      console.error(
        "[kv] CRITICAL: DENO_KV_PATH is set in a Deno Deploy environment. " +
          "This causes data loss on isolate restarts. Remove DENO_KV_PATH from your deployment env vars.",
      );
    }
    const path = isDeployment ? undefined : envPath;
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
