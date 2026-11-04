// Tiny per-server-instance TTL cache for hot, rarely-changing reads (settings, currencies).
// DECISION: in-memory instead of unstable_cache because rows hold BigInt/Decimal values that do not
// JSON-serialise. Writes on this instance clear it at once; other warm instances refresh within TTL_MS.
const TTL_MS = 30_000;
const store = new Map<string, { at: number; p: Promise<unknown> }>();

export function memo<T>(key: string, fn: () => Promise<T>, ttl = TTL_MS): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.p as Promise<T>;
  const p = fn();
  store.set(key, { at: Date.now(), p });
  p.catch(() => store.delete(key)); // never cache a failure
  return p;
}

export function clearMemo(key?: string) {
  if (key) store.delete(key);
  else store.clear();
}
