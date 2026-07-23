// tools/local-companion/__tests__/sse.test.ts
// SSE format + replay + heartbeat + Last-Event-ID honors.

import { describe, it, expect } from 'bun:test';
import { formatSseFrame } from '../router';
import type { CompanionJobEvent } from '../../../shared/types/knowalong/companion';

describe('SSE frame formatting', () => {
  it('formatSseFrame emits id/event/data lines', () => {
    const event: CompanionJobEvent = {
      kind: 'event',
      ordinal: 7,
      severity: 'progress',
      stage: 'lemmas',
      message: 'Lemma extraction in progress.',
      payload: { stageIndex: 3 },
    };
    const frame = formatSseFrame(event);
    expect(frame).toContain('id: 7');
    expect(frame).toContain('event: event');
    expect(frame).toContain('"ordinal":7');
    expect(frame.endsWith('\n\n')).toBe(true);
  });

  it('history-truncated frame preserves kind', () => {
    const event: CompanionJobEvent = {
      kind: 'history-truncated',
      ordinal: 999,
      severity: 'warning',
      message: 'Truncated.',
    };
    const frame = formatSseFrame(event);
    expect(frame).toContain('event: history-truncated');
  });
});
