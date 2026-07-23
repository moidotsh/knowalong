// services/base/BaseQueueService.ts
// Abstract base class for queue services. Provides the common shape:
// in-memory queue, async storage persistence, subscribe/notify, and
// a merge-aware loadQueue that doesn't blow away items added during
// the load window. Consumers extend this per-domain (e.g.
// `WorkoutQueueService extends BaseQueueService<PendingWorkout>`).

import { zustandStorage } from '../../stores';
import { logger, type LogContext } from '../../utils/logger';

/**
 * @typeParam T - The queue item type. Must carry an `id` for CRUD ops.
 */
export abstract class BaseQueueService<T extends { id: string }> {
  protected queue: T[] = [];
  protected isLoaded = false;
  protected listeners: Set<() => void> = new Set();

  /** Storage key — must be unique per concrete service. */
  protected abstract storageKey: string;

  /** Logger context — appears in `[CONTEXT]` prefix in log output. */
  protected abstract logContext: LogContext;

  constructor() {
    void this.loadQueue();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Load queue from storage. Merge-aware: in-memory items win on
   * id-collision (their state is more recent), stored items are
   * appended otherwise. Preserves items added during the load window.
   */
  protected async loadQueue(): Promise<void> {
    let stored: string | null = null;
    try {
      stored = await zustandStorage.getItem(this.storageKey);
      if (stored) {
        const storedItems: T[] = JSON.parse(stored);
        const existingIds = new Set(this.queue.map((item) => item.id));
        const merged = [
          ...this.queue,
          ...storedItems.filter((item) => !existingIds.has(item.id)),
        ];
        const preLoadCount = this.queue.length;
        this.queue = merged;
        logger.debug(
          this.logContext,
          `Loaded ${storedItems.length} items from storage, merged with ${preLoadCount} pre-load items`,
        );
      }
      this.isLoaded = true;
      this.notify();
    } catch (error) {
      if (stored) {
        // Preserve the corrupt blob for forensic recovery.
        const backupKey = `${this.storageKey}_corrupted_${Date.now()}`;
        try {
          await zustandStorage.setItem(backupKey, stored);
        } catch {
          // Even the backup write failed — log and move on. The user's
          // session continues; the queue resets to empty.
        }
        logger.error(
          this.logContext,
          `Preserved corrupt queue blob to "${backupKey}"`,
          error instanceof Error ? error : undefined,
        );
      } else {
        logger.warn(this.logContext, 'loadQueue: no stored blob, starting empty');
      }
      this.isLoaded = true;
      this.queue = [];
      this.notify();
    }
  }

  /**
   * Persist the current in-memory queue to storage.
   */
  protected async persistQueue(): Promise<void> {
    try {
      await zustandStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      logger.error(
        this.logContext,
        'Failed to persist queue',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get all items (snapshot — mutate via the queue methods, not the
   * returned array).
   */
  getAll(): T[] {
    return [...this.queue];
  }

  getById(id: string): T | undefined {
    return this.queue.find((item) => item.id === id);
  }

  hasItem(id: string): boolean {
    return this.queue.some((item) => item.id === id);
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.queue.filter(predicate);
  }

  /**
   * Add an item to the queue. Persists and notifies subscribers.
   */
  addToQueue(item: T): void {
    this.queue.push(item);
    void this.persistQueue();
    this.notify();
  }

  /**
   * Remove an item by id.
   */
  removeFromQueue(id: string): boolean {
    const before = this.queue.length;
    this.queue = this.queue.filter((item) => item.id !== id);
    const removed = this.queue.length < before;
    if (removed) {
      void this.persistQueue();
      this.notify();
    }
    return removed;
  }

  /**
   * Update an item in place. Returns true if the item was found.
   */
  updateItem(id: string, updates: Partial<T>): boolean {
    const idx = this.queue.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    this.queue[idx] = { ...this.queue[idx], ...updates };
    void this.persistQueue();
    this.notify();
    return true;
  }

  /**
   * Wipe the queue. Use on logout / account deletion so a new user
   * doesn't inherit the previous user's pending items.
   */
  reset(): void {
    this.queue = [];
    void this.persistQueue();
    this.notify();
  }
}
