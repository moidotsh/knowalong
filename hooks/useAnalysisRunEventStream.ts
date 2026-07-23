// hooks/useAnalysisRunEventStream.ts
// Lifecycle hook for the authenticated SSE-over-fetch event stream of an
// analysis run. NOT a Zustand timer registry — this hook:
//
//   1. Opens the SSE stream when the run is active (not in a terminal state).
//   2. Buffers incoming events and flushes them to the DB via the
//      analysis/CLCC service's ingestEvents (deduped by (run_id, ordinal)).
//   3. Closes on unmount / terminal status / run-id change via AbortController.
//   4. Falls back to short-interval polling when fetch streaming is unavailable
//      (rare browsers / SSR).
//   5. Calls the service's finalize() on clean close to land proposals +
//      transition to awaiting_review.
//   6. Rate-limits stage_start announcements for screen readers (avoid
//      flooding AT with rapid progress updates).
//
// The token NEVER appears in URLs, query strings, event IDs, or persisted
// payloads — that's enforced in utils/companion/companionClient.ts and tested.

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/react-query';
import {
  localAnalysisService,
  clccGenerationService,
  companionClientService,
} from '../services';
import { useAnalysisRun } from './queries';
import { useCurrentUserId } from './queries';
import type { CompanionJobEvent } from '../shared/types/knowalong';
import { logger } from '../utils/logger';

const FLUSH_INTERVAL_MS = 1_000;
const POLL_FALLBACK_INTERVAL_MS = 2_000;
const STAGE_ANNOUNCE_THROTTLE_MS = 1_500;

export interface UseAnalysisRunEventStreamOptions {
  runId: string | null;
  runType: 'source_analysis' | 'clcc_generation';
}

export interface UseAnalysisRunEventStreamResult {
  /** Latest stage label seen on the stream (for screen-reader live region). */
  latestStage: string | null;
  /** True while the stream is open and the run is active. */
  isActive: boolean;
}

/**
 * Open + manage the SSE event stream for a run. Returns nothing renderable —
 * callers render from useAnalysisRun + useAnalysisRunEvents. This hook exists
 * to own the stream lifecycle.
 */
export function useAnalysisRunEventStream(
  options: UseAnalysisRunEventStreamOptions,
): UseAnalysisRunEventStreamResult {
  const { runId, runType } = options;
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  const runQuery = useAnalysisRun(runId);

  // Refs hold the latest state without re-running the effect on every render.
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef<CompanionJobEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStageAnnounceRef = useRef<{ stage: string; at: number } | null>(null);
  const finalizedRef = useRef<boolean>(false);

  const service = runType === 'source_analysis' ? localAnalysisService : clccGenerationService;

  // ── Helpers ────────────────────────────────────────────────────────

  const flush = async () => {
    if (!runId || !userId) return;
    const snapshot = bufferRef.current;
    if (snapshot.length === 0) return;
    bufferRef.current = [];
    try {
      await service.ingestEvents(runId, userId, snapshot);
      // Invalidate the events cache so the timeline picks up new entries.
      qc.invalidateQueries({ queryKey: queryKeys.analysisRuns.events(runId) });
    } catch (e) {
      // Put the events back at the head of the buffer; they'll retry next flush.
      bufferRef.current = [...snapshot, ...bufferRef.current];
      logger.warn('analysis', 'event stream flush failed', e);
    }
  };

  const finalize = async () => {
    if (!runId || !userId) return;
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    await flush();
    const run = runQuery.data;
    const companionJobId = run?.companionJobId ?? null;
    if (companionJobId) {
      try {
        await service.finalize(runId, userId, companionJobId);
      } catch (e) {
        logger.warn('analysis', 'finalize failed', e);
      }
    }
    qc.invalidateQueries({ queryKey: queryKeys.analysisRuns.detail(runId) });
    qc.invalidateQueries({ queryKey: queryKeys.analysisRuns.proposals(runId) });
  };

  const handleEvent = (event: CompanionJobEvent) => {
    bufferRef.current.push(event);
    // Stage announcement throttling for screen readers.
    if (event.stage && (event.severity === 'stage_start' || event.severity === 'stage_complete')) {
      const now = Date.now();
      const last = lastStageAnnounceRef.current;
      if (!last || last.stage !== event.stage || now - last.at > STAGE_ANNOUNCE_THROTTLE_MS) {
        lastStageAnnounceRef.current = { stage: event.stage, at: now };
      }
    }
  };

  // ── Stream lifecycle ───────────────────────────────────────────────

  useEffect(() => {
    if (!runId || !userId) return;
    const status = runQuery.data?.status;
    const isTerminal = status === 'awaiting_review' || status === 'failed' || status === 'cancelled';
    if (isTerminal) {
      // If the run is already terminal on mount, ensure finalize has run.
      if (!finalizedRef.current) {
        void finalize();
      }
      return;
    }

    const companionJobId = runQuery.data?.companionJobId;
    if (!companionJobId) return; // Companion hasn't accepted the job yet.

    finalizedRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;

    // Periodic flush of buffered events.
    flushTimerRef.current = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);

    let usedFallback = false;
    let streamClosed = false;

    // Open the SSE-over-fetch stream.
    void (async () => {
      const result = await companionClientService.openEventStream(companionJobId, {
        signal: controller.signal,
        onEvent: handleEvent,
        onClose: (reason) => {
          if (streamClosed) return;
          streamClosed = true;
          if (reason === 'clean') {
            void finalize();
          }
        },
      });
      // If openEventStream returned an error (not a cleanup function), the
      // stream never opened. Fall back to polling.
      if (result && typeof result === 'object' && 'kind' in result) {
        usedFallback = true;
        logger.warn('analysis', 'SSE-over-fetch unavailable; falling back to polling', result);
        startPolling(companionJobId, controller.signal);
      }
    })();

    function startPolling(jobId: string, signal: AbortSignal) {
      let lastOrdinal = 0;
      pollTimerRef.current = setInterval(async () => {
        if (signal.aborted) return;
        try {
          const result = await companionClientService.pollJobEvents(jobId, lastOrdinal);
          if ('status' in result && result.status === 'ok') {
            for (const e of result.data.events) {
              handleEvent(e);
              if (typeof e.ordinal === 'number' && e.ordinal > lastOrdinal) lastOrdinal = e.ordinal;
            }
          }
        } catch (e) {
          logger.warn('analysis', 'poll fallback error', e);
        }
      }, POLL_FALLBACK_INTERVAL_MS);
    }

    return () => {
      controller.abort();
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      abortRef.current = null;
      flushTimerRef.current = null;
      pollTimerRef.current = null;
      // Final flush on unmount.
      void flush();
      void usedFallback;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, userId, runQuery.data?.companionJobId, runQuery.data?.status]);

  return {
    latestStage: lastStageAnnounceRef.current?.stage ?? null,
    isActive: !!runId && !!runQuery.data?.companionJobId && !['awaiting_review', 'failed', 'cancelled'].includes(runQuery.data?.status ?? ''),
  };
}
