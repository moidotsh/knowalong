// services/offlineQueueService.ts
// Generic offline mutation queue. Consumers type this per-domain:
//
//   import { OfflineQueueService } from '@services';
//   import type { PendingWorkout } from '@shared/types';
//   export class WorkoutQueueService extends OfflineQueueService<PendingWorkout> {
//     protected storageKey = 'myapp_workout_queue';
//     protected syncItem(item: PendingWorkout): Promise<boolean> {
//       return workoutRepository.create(item).then(r => r.success);
//     }
//   }
//
// The base class handles persistence + listener plumbing; the consumer
// implements `syncItem` (the actual RPC / repository call that flushes
// the item when the network comes back).

import { BaseQueueService } from './base';
import { logger } from '../utils';

export type QueueItemStatus = 'pending' | 'syncing' | 'failed';

export interface QueueItem {
  id: string;
  status: QueueItemStatus;
  syncAttempts: number;
  lastSyncAttempt?: string;
  lastError?: string;
  createdAt?: string;
}

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
}

export abstract class OfflineQueueService<T extends QueueItem> extends BaseQueueService<T> {
  protected logContext = 'offlineQueue' as const;

  private isSyncing = false;
  private syncGeneration = 0;

  /**
   * Flush a single item. Return true on success, false on failure
   * (the item will be retried or marked failed based on `syncAttempts`).
   */
  protected abstract syncItem(item: T): Promise<boolean>;

  /**
   * Get all pending items (status === 'pending' || 'failed').
   */
  getPending(): T[] {
    return this.filter((s) => s.status === 'pending' || s.status === 'failed');
  }

  /**
   * Count of pending items (excludes 'syncing').
   */
  getPendingCount(): number {
    return this.getPending().length;
  }

  /**
   * Flush all pending items. Re-entrancy-guarded (a second call while
   * the first is in flight returns the in-flight promise's result via
   * the generation counter). Generation-aware: a `reset()` during sync
   * invalidates the in-flight loop so stale items don't land in the
   * new user's queue.
   */
  async syncPending(): Promise<SyncResult> {
    if (this.isSyncing) {
      logger.debug(this.logContext, 'syncPending already in flight, skipping');
      return { synced: 0, failed: 0, remaining: this.getPendingCount() };
    }
    this.isSyncing = true;
    const myGeneration = ++this.syncGeneration;

    let synced = 0;
    let failed = 0;
    const pending = this.getPending();

    for (const item of pending) {
      // Generation bail-out: a reset() bumped the counter; abandon.
      if (myGeneration !== this.syncGeneration) {
        logger.warn(this.logContext, 'syncPending aborted — queue reset mid-sync');
        break;
      }

      this.updateItem(item.id, {
        status: 'syncing',
        lastSyncAttempt: new Date().toISOString(),
      } as Partial<T>);

      try {
        const success = await this.syncItem(item);
        if (myGeneration !== this.syncGeneration) break;

        if (success) {
          this.removeFromQueue(item.id);
          synced++;
        } else {
          this.updateItem(item.id, {
            status: 'failed',
            syncAttempts: item.syncAttempts + 1,
            lastError: 'syncItem returned false',
          } as Partial<T>);
          failed++;
        }
      } catch (e) {
        if (myGeneration !== this.syncGeneration) break;
        const message = e instanceof Error ? e.message : 'unknown error';
        this.updateItem(item.id, {
          status: 'failed',
          syncAttempts: item.syncAttempts + 1,
          lastError: message,
        } as Partial<T>);
        failed++;
        logger.warn(this.logContext, `Sync failed for ${item.id}:`, message);
      }
    }

    this.isSyncing = false;
    return {
      synced,
      failed,
      remaining: this.getPendingCount(),
    };
  }

  /**
   * Reset generation + clear queue. Used on logout / account switch
   * so an in-flight sync bails out of its loop and doesn't land stale
   * items in the new session.
   */
  reset(): void {
    this.syncGeneration++;
    this.isSyncing = false;
    super.reset();
  }
}
