// tools/local-companion/__tests__/jobManager.test.ts
// State machine tests: valid transitions, terminal rejection, no
// 'succeeded' terminal, cancel semantics.

import { describe, it, expect, beforeEach } from 'bun:test';
import { jobManager, isTerminalStatus, isValidTransition } from '../jobManager';

describe('jobManager', () => {
  beforeEach(() => {
    (jobManager as unknown as { _resetForTests: () => void })._resetForTests();
  });

  it('creates a job in queued status', () => {
    const job = jobManager.create('j1', 'source_analysis', {});
    expect(job.status).toBe('queued');
  });

  it('transitions queued → connecting → running → validating → awaiting_review', () => {
    jobManager.create('j2', 'source_analysis', {});
    expect(jobManager.transition('j2', 'connecting')).toBe(true);
    expect(jobManager.transition('j2', 'running')).toBe(true);
    expect(jobManager.transition('j2', 'validating')).toBe(true);
    expect(jobManager.transition('j2', 'awaiting_review')).toBe(true);
    const job = jobManager.get('j2')!;
    expect(job.status).toBe('awaiting_review');
    expect(job.completedAt).not.toBeNull();
  });

  it('rejects transition from a terminal state', () => {
    jobManager.create('j3', 'source_analysis', {});
    jobManager.transition('j3', 'failed');
    expect(jobManager.transition('j3', 'running')).toBe(false);
  });

  it('fail() sets status to failed with reason', () => {
    jobManager.create('j4', 'source_analysis', {});
    jobManager.fail('j4', 'companion.mixed-content-blocked');
    expect(jobManager.get('j4')!.status).toBe('failed');
    expect(jobManager.get('j4')!.failureReason).toBe('companion.mixed-content-blocked');
  });

  it('cancel() is rejected for already-terminal jobs', () => {
    jobManager.create('j5', 'source_analysis', {});
    jobManager.fail('j5', 'x');
    expect(jobManager.cancel('j5')).toBe(false);
  });

  it('isTerminalStatus correctly identifies terminal statuses', () => {
    expect(isTerminalStatus('awaiting_review')).toBe(true);
    expect(isTerminalStatus('failed')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
    expect(isTerminalStatus('running')).toBe(false);
  });

  it('isValidTransition: cannot leave awaiting_review', () => {
    expect(isValidTransition('awaiting_review', 'running')).toBe(false);
  });

  it('appendEvent + eventsSince replay', () => {
    jobManager.create('j6', 'source_analysis', {});
    jobManager.appendEvent('j6', { kind: 'event', ordinal: 1, severity: 'info', message: 'first' });
    jobManager.appendEvent('j6', { kind: 'event', ordinal: 2, severity: 'info', message: 'second' });
    const since1 = jobManager.eventsSince('j6', 1);
    expect(since1.length).toBe(1);
    expect(since1[0].ordinal).toBe(2);
  });

  it('appends a history-truncated event when cap is exceeded', () => {
    jobManager.create('j7', 'source_analysis', {});
    for (let i = 1; i <= 2005; i++) {
      jobManager.appendEvent('j7', { kind: 'event', ordinal: i, severity: 'info', message: `e${i}` });
    }
    const job = jobManager.get('j7')!;
    expect(job.events.some((e) => e.kind === 'history-truncated')).toBe(true);
  });

  it('complete() transitions to awaiting_review with result', () => {
    jobManager.create('j8', 'source_analysis', {});
    jobManager.transition('j8', 'running');
    jobManager.complete('j8', { proposalCounts: { lemma: 5 }, proposals: [], summary: {} });
    expect(jobManager.get('j8')!.status).toBe('awaiting_review');
    expect(jobManager.get('j8')!.result?.proposalCounts.lemma).toBe(5);
  });
});
