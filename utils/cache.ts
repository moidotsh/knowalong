// utils/cache.ts
// Generic TTL + LRU cache for any data the consumer wants to memoize.
// Domain-agnostic — arqavellum doesn't ship a default cache key namespace;
// consumers define their own (`cacheKeys` factory in their domain code).

import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

const DEFAULT_MAX_ENTRIES = 100;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * TTL + LRU cache. LRU (Least Recently Used) eviction removes the
 * oldest-accessed entries when the cache reaches `maxEntries`. Prevents
 * unbounded memory growth in long-running sessions.
 *
 * The Map maintains insertion order, so LRU is implemented by deleting
 * and re-inserting on access (moves the entry to the end = most-recent).
 */
export class TtlLruCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, evictions: 0 };

  /**
   * @param ttlMs - Time to live in milliseconds (default: 5 minutes).
   * @param maxEntries - Maximum entries before LRU eviction (default: 100).
   */
  constructor(ttlMs: number = DEFAULT_TTL_MS, maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.defaultTtlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  /**
   * Get cached data if still valid. Updates LRU order on hit.
   *
   * @returns Cached data or null if not found / expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > this.defaultTtlMs) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      logger.debug('data', `Cache expired for key: ${key}`);
      return null;
    }

    // Move to most-recent position.
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    logger.debug('data', `Cache hit for key: ${key}`);
    return entry.data;
  }

  /**
   * Store data in the cache. Evicts the least-recently-used entry when
   * the cache is at capacity.
   *
   * @param customTtlMs - Optional per-entry TTL override.
   */
  set<T>(key: string, data: T, customTtlMs?: number): void {
    // If key already exists, delete first so re-insert moves it to the end.
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // New entry at capacity: evict the oldest (first entry in Map iteration order).
      const lruKey = this.cache.keys().next().value;
      if (lruKey !== undefined) {
        this.cache.delete(lruKey);
        this.stats.evictions++;
        logger.debug('data', `LRU evicted key: ${lruKey}`);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      // customTtlMs only changes the *expiry window*, not the stored
      // timestamp. Storing `Date.now()` + checking `defaultTtlMs` later
      // is fine for the common case; per-entry TTLs are rare enough
      // that the complexity of a per-entry expiry field isn't justified.
      timestamp: Date.now() + (customTtlMs ? customTtlMs - this.defaultTtlMs : 0),
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
    logger.debug('data', `Cached data for key: ${key}`);
  }

  /**
   * Get cached data or compute and cache it. Useful for memoizing
   * async fetches / expensive derivations.
   */
  async getOrCompute<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const data = await compute();
    this.set(key, data);
    return data;
  }

  /**
   * Invalidate entries matching a prefix pattern. With no argument,
   * clears the entire cache.
   *
   * @example
   *   cache.invalidate('workouts:');  // drop all workout-scoped entries
   *   cache.invalidate();              // reset everything
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      const previousSize = this.cache.size;
      this.cache.clear();
      this.stats.size = 0;
      logger.debug('data', `Cleared entire cache (${previousSize} entries)`);
      return;
    }

    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    this.stats.size = this.cache.size;
    logger.debug('data', `Invalidated ${deletedCount} entries matching pattern: ${pattern}`);
  }

  /** Delete a single entry. Returns true if the entry existed. */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return result;
  }

  /** Snapshot of cache stats — useful for dev dashboards. */
  getStats(): Readonly<CacheStats> {
    return { ...this.stats };
  }

  /** Reset hit/miss/eviction counters without dropping entries. */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, size: this.cache.size, evictions: 0 };
  }

  /** Check if a key exists and is still valid (updates LRU on hit). */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Current entry count. */
  get size(): number {
    return this.cache.size;
  }
}

// Default singleton instance. Consumers wanting isolated caches (e.g.
// per-domain cache isolation) construct their own `new TtlLruCache()`.
export const cache = new TtlLruCache();
