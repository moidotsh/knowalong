// supabase/functions/_shared/geo-lookup.ts
// Shared geo resolver for edge functions.
//
// Resolves an IP to { country_code, region } via ip-api.com. Stores only
// coarse geo — no city, no coords, no ISP — because that is all the
// telemetry/audit tables need and it minimizes PII surface.
//
// Contract:
//   - Never throws. Any error/timeout/unroutable IP yields { null, null }.
//     Geo is a nice-to-have; it must not break the calling flow.
//   - 2-second hard timeout per request.
//   - In-memory cache, 10-minute TTL. Most registration/login calls come
//     from a small set of IPs, so cache hits dominate after warm-up.

interface GeoResult {
  country_code: string | null;
  region: string | null;
}

interface CacheEntry {
  value: GeoResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 2000;
const MAX_CACHE_SIZE = 1000;
const cache = new Map<string, CacheEntry>();

// IPv4 private/loopback/reserved ranges + IPv6 loopback/mapped.
// Anything matching here short-circuits to nulls without a network call.
const PRIVATE_IP_PATTERNS = [
  /^unknown$/i,
  /^127\./, // loopback v4
  /^10\./, // private class A
  /^192\.168\./, // private class C
  /^172\.(1[6-9]|2\d|3[01])\./, // private class B
  /^169\.254\./, // link-local
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 unique-local
  /^fe80:/i, // IPv6 link-local
  /^::ffff:/i, // IPv6-mapped IPv4 (strip and re-check below)
];

function isPrivateOrLocal(ip: string): boolean {
  if (!ip) return true;
  // Strip IPv6-mapped IPv4 prefix and re-check the embedded v4.
  const v4FromV6 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const candidate = v4FromV6 ? v4FromV6[1] : ip;
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(candidate)) return true;
  }
  // Catch mapped-v4 that itself resolves to a private range.
  if (v4FromV6) {
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(v4FromV6[1])) return true;
    }
  }
  return false;
}

function getCached(ip: string): GeoResult | undefined {
  const entry = cache.get(ip);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(ip);
    return undefined;
  }
  return entry.value;
}

function setCached(ip: string, value: GeoResult): void {
  // Bound the cache so a flood of distinct client IPs can't grow it
  // unbounded across the function instance's lifetime. LRU isn't worth
  // the complexity here — a random eviction when over-cap is fine since
  // a cache miss just costs one extra ip-api.com roundtrip.
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(ip, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Resolve an IP to { country_code, region }.
 *
 * Returns { country_code: null, region: null } for private/localhost IPs,
 * timeouts, provider failures, or any unexpected error. Never throws.
 */
export async function resolveGeoFromIp(ip: string): Promise<GeoResult> {
  const EMPTY: GeoResult = { country_code: null, region: null };
  if (!ip || isPrivateOrLocal(ip)) return EMPTY;

  const cached = getCached(ip);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,regionName`,
      { signal: controller.signal },
    );
    if (!response.ok) return EMPTY;

    const data = (await response.json()) as {
      status?: string;
      countryCode?: string;
      regionName?: string;
    };

    if (data.status !== 'success') {
      // Cache misses too so we don't hammer the provider on repeat bad IPs.
      setCached(ip, EMPTY);
      return EMPTY;
    }

    const result: GeoResult = {
      country_code: data.countryCode || null,
      region: data.regionName || null,
    };
    setCached(ip, result);
    return result;
  } catch {
    // AbortController abort on timeout lands here; swallow everything.
    return EMPTY;
  } finally {
    clearTimeout(timeout);
  }
}
