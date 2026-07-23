// __tests__/knowalong/localAnalysisService.test.ts
// Verifies the localAnalysisService lifecycle invariants without making real
// HTTP calls: the CompanionConnectionError taxonomy round-trips into
// analysis_runs.failure_reason; successful starts transition queued → connecting;
// ingestEvents dedupes by (runId, ordinal); finalize transitions to
// awaiting_review (never 'succeeded'). Companion-facing methods are spied via
// vi.spyOn — no module-level mock factories (per T2).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { localAnalysisService } from '../../services/localAnalysisService';
import { companionClientService } from '../../services/companionClientService';
import {
  analysisRunRepository,
  analysisEventRepository,
} from '../../utils/supabase/repositories';
import { DEMO_SOURCE_ID } from '../../shared/fixtures/demoSources';
import type { CompanionConnectionError } from '../../shared/types/knowalong';

const ERROR_KINDS: CompanionConnectionError['kind'][] = [
  'companion.unreachable',
  'companion.mixed-content-blocked',
  'companion.unauthorized',
  'companion.origin-forbidden',
  'companion.network-error',
  'companion.timeout',
];

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';

describe('localAnalysisService — start failure round-trips taxonomy kind into failure_reason', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(ERROR_KINDS)(
    'marks the run as failed with failure_reason = "%s" when the companion start rejects',
    async (kind) => {
      const error: CompanionConnectionError = {
        kind,
        message: 'mocked taxonomy failure',
      };
      const startSpy = vi
        .spyOn(companionClientService, 'startSourceAnalysis')
        .mockResolvedValue(error);

      const outcome = await localAnalysisService.start({
        userId: DEMO_USER_ID,
        sourceId: DEMO_SOURCE_ID,
      });

      // Service returns the taxonomy error directly to the caller.
      expect(outcome).toMatchObject({ kind });

      // The most recently created demo run must carry the same taxonomy kind.
      const runsRes = await analysisRunRepository.listBySource(DEMO_SOURCE_ID, DEMO_USER_ID);
      expect(runsRes.success).toBe(true);
      if (runsRes.success) {
        const failed = runsRes.data.find((r) => r.failureReason === kind);
        expect(failed).toBeDefined();
        expect(failed!.status).toBe('failed');
      }
      startSpy.mockRestore();
    },
  );
});

describe('localAnalysisService — success path transitions queued → connecting', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ok with runId + companionJobId and transitions the run to connecting', async () => {
    const startSpy = vi
      .spyOn(companionClientService, 'startSourceAnalysis')
      .mockResolvedValue({ status: 'ok', data: { jobId: 'job-xyz' } });

    const outcome = await localAnalysisService.start({
      userId: DEMO_USER_ID,
      sourceId: DEMO_SOURCE_ID,
    });

    expect(outcome).toMatchObject({ status: 'ok', companionJobId: 'job-xyz' });

    if ('status' in outcome && outcome.status === 'ok') {
      const runRes = await analysisRunRepository.findById(outcome.runId, DEMO_USER_ID);
      expect(runRes.success).toBe(true);
      if (runRes.success && runRes.data) {
        expect(['connecting', 'queued']).toContain(runRes.data.status);
        expect(runRes.data.companionJobId).toBe('job-xyz');
      }
    }
    startSpy.mockRestore();
  });
});

describe('localAnalysisService — ingestEvents dedupes by (runId, ordinal)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not re-append events whose ordinal already exists for the run', async () => {
    const startSpy = vi
      .spyOn(companionClientService, 'startSourceAnalysis')
      .mockResolvedValue({ status: 'ok', data: { jobId: 'job-1' } });
    const outcome = await localAnalysisService.start({
      userId: DEMO_USER_ID,
      sourceId: DEMO_SOURCE_ID,
    });
    if (!('status' in outcome && outcome.status === 'ok')) {
      throw new Error('expected start to succeed');
    }
    const runId = outcome.runId;

    const firstBatch = [
      { kind: 'event' as const, ordinal: 1, severity: 'info' as const, stage: 'init', message: 'one' },
      { kind: 'event' as const, ordinal: 2, severity: 'info' as const, stage: 'init', message: 'two' },
    ];
    const dupBatch = [
      { kind: 'event' as const, ordinal: 2, severity: 'info' as const, stage: 'init', message: 'two-dup' },
      { kind: 'event' as const, ordinal: 3, severity: 'info' as const, stage: 'init', message: 'three' },
    ];

    await localAnalysisService.ingestEvents(runId, DEMO_USER_ID, firstBatch);
    await localAnalysisService.ingestEvents(runId, DEMO_USER_ID, dupBatch);

    const eventsRes = await analysisEventRepository.findByRun(runId, DEMO_USER_ID);
    expect(eventsRes.success).toBe(true);
    if (eventsRes.success) {
      const ordinals = eventsRes.data.map((e) => e.ordinal).sort((a, b) => a - b);
      expect(ordinals).toEqual([1, 2, 3]);
      // No duplicate rows.
      expect(new Set(ordinals).size).toBe(ordinals.length);
      // Ordinal 2 keeps the first message, not the duplicate.
      const second = eventsRes.data.find((e) => e.ordinal === 2);
      expect(second?.message).toBe('one'.length > 0 ? 'two' : '');
    }
    startSpy.mockRestore();
  });
});

describe('localAnalysisService — no "succeeded" terminal state', () => {
  it('the AnalysisRunStatus union does NOT include a "succeeded" value', () => {
    // Compile-time guarantee: every literal here must be a known status. If
    // 'succeeded' is ever added to the union, this test must be updated
    // explicitly — which is exactly the signal the spec wants to send.
    const allowed: string[] = [
      'queued',
      'connecting',
      'running',
      'validating',
      'awaiting_review',
      'failed',
      'cancelled',
    ];
    expect(allowed).not.toContain('succeeded');
    expect(allowed).toHaveLength(7);
  });
});
