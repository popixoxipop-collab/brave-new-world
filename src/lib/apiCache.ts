// Shared in-memory TTL cache for layer API routes
type CacheEntry<T> = { expiresAt: number; value: T };

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function cachedFetchJson<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<{ data: T; cached: boolean }> {
  const hit = getCached<T>(key);
  if (hit !== null) return { data: hit, cached: true };
  const data = await loader();
  setCached(key, data, ttlMs);
  return { data, cached: false };
}
