// __tests__/knowalong/clccGenerationService.test.ts
// Verifies the clccGenerationService lifecycle invariants: the taxonomy kind
// round-trips into failure_reason, the success path transitions queued →
// connecting, and — critically — NO promotion path exists (CLCC promotion
// into concept_realizations is deferred for this checkpoint). Realization
// proposals are reviewable/exportable only; the service exposes no
// promoteRealization / acceptRealization method.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clccGenerationService } from '../../services/clccGenerationService';
import { companionClientService } from '../../services/companionClientService';
import { analysisRunRepository } from '../../utils/supabase/repositories';
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

describe('clccGenerationService — start failure round-trips taxonomy kind into failure_reason', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(ERROR_KINDS)(
    'marks the run as failed with failure_reason = "%s" when the companion rejects',
    async (kind) => {
      const error: CompanionConnectionError = { kind, message: 'mocked failure' };
      const startSpy = vi
        .spyOn(companionClientService, 'startClccGeneration')
        .mockResolvedValue(error);

      const outcome = await clccGenerationService.start({
        userId: DEMO_USER_ID,
        targetLanguageCode: 'fr',
        coreConceptCodes: ['EXIST', 'WANT'],
      });

      expect(outcome).toMatchObject({ kind });

      const runsRes = await analysisRunRepository.listByUser(DEMO_USER_ID);
      expect(runsRes.success).toBe(true);
      if (runsRes.success) {
        const failed = runsRes.data.find(
          (r) => r.runType === 'clcc_generation' && r.failureReason === kind,
        );
        expect(failed).toBeDefined();
        expect(failed!.status).toBe('failed');
      }
      startSpy.mockRestore();
    },
  );
});

describe('clccGenerationService — success path', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ok with runId + companionJobId; run transitions to connecting', async () => {
    const startSpy = vi
      .spyOn(companionClientService, 'startClccGeneration')
      .mockResolvedValue({ status: 'ok', data: { jobId: 'clcc-job-1' } });

    const outcome = await clccGenerationService.start({
      userId: DEMO_USER_ID,
      targetLanguageCode: 'fr',
      coreConceptCodes: ['EXIST', 'WANT'],
    });

    expect(outcome).toMatchObject({ status: 'ok', companionJobId: 'clcc-job-1' });
    if ('status' in outcome && outcome.status === 'ok') {
      const runRes = await analysisRunRepository.findById(outcome.runId, DEMO_USER_ID);
      expect(runRes.success).toBe(true);
      if (runRes.success && runRes.data) {
        expect(['connecting', 'queued']).toContain(runRes.data.status);
        expect(runRes.data.runType).toBe('clcc_generation');
        expect(runRes.data.companionJobId).toBe('clcc-job-1');
      }
    }
    startSpy.mockRestore();
  });
});

describe('clccGenerationService — promotion deferred invariants', () => {
  it('does NOT expose any realization-promotion method (CLCC promotion is deferred)', () => {
    const surface = clccGenerationService as unknown as Record<string, unknown>;
    expect(surface.promoteRealization).toBeUndefined();
    expect(surface.acceptRealization).toBeUndefined();
    expect(surface.promote).toBeUndefined();
    expect(surface.accept).toBeUndefined();
    expect(surface.createRealization).toBeUndefined();
  });

  it('exposes only start / ingestEvents / finalize / fail / cancel / deleteRun', () => {
    const surface = clccGenerationService as unknown as Record<string, unknown>;
    const methods = Object.keys(surface).sort();
    expect(methods).toEqual(
      ['cancel', 'deleteRun', 'fail', 'finalize', 'ingestEvents', 'start'].sort(),
    );
  });
});
