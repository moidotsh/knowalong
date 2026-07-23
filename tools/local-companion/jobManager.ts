// tools/local-companion/jobManager.ts
// In-memory state machine for companion jobs. Single-flight per job. State
// transitions: queued → connecting → running → validating → awaiting_review
// | failed | cancelled. There is intentionally NO 'succeeded' terminal —
// analysis output is proposal-only and always requires explicit PWA review.

import type {
  CompanionJobStatus,
  CompanionResultProposal,
  CompanionJobEvent,
} from '../../shared/types/knowalong/companion';

const MAX_RETAINED_EVENTS = 2000;

export interface JobState {
  id: string;
  status: CompanionJobStatus;
  stage: string | null;
  stageIndex: number | null;
  stageCount: number | null;
  subProgress: number | null;
  runType: 'source_analysis' | 'clcc_generation';
  request: Record<string, unknown>;
  failureReason?: string;
  events: CompanionJobEvent[];
  result: {
    proposalCounts: Record<string, number>;
    proposals: CompanionResultProposal[];
    summary: Record<string, unknown>;
  } | null;
  createdAt: string;
  completedAt: string | null;
}

class JobManager {
  private jobs: Map<string, JobState> = new Map();

  create(id: string, runType: 'source_analysis' | 'clcc_generation', request: Record<string, unknown>): JobState {
    const job: JobState = {
      id,
      status: 'queued',
      stage: null,
      stageIndex: null,
      stageCount: null,
      subProgress: null,
      runType,
      request,
      events: [],
      result: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.jobs.set(id, job);
    return job;
  }

  get(id: string): JobState | null {
    return this.jobs.get(id) ?? null;
  }

  exists(id: string): boolean {
    return this.jobs.has(id);
  }

  /**
   * Transition to a new status. Rejects invalid transitions (e.g. from a
   * terminal state). Returns true on success.
   */
  transition(id: string, next: CompanionJobStatus): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (isTerminal(job.status)) return false; // Terminal is final.
    if (!isValidTransition(job.status, next)) return false;
    job.status = next;
    if (isTerminal(next)) {
      job.completedAt = new Date().toISOString();
    }
    return true;
  }

  setStage(id: string, stage: string, stageIndex: number, stageCount: number): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.stage = stage;
    job.stageIndex = stageIndex;
    job.stageCount = stageCount;
    job.subProgress = null;
  }

  setSubProgress(id: string, sub: number | null): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.subProgress = sub;
  }

  fail(id: string, reason: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    if (isTerminal(job.status)) return;
    job.status = 'failed';
    job.failureReason = reason;
    job.completedAt = new Date().toISOString();
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (isTerminal(job.status)) return false;
    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();
    return true;
  }

  /**
   * Append an event to the job's retained buffer. Emits a single
   * `history-truncated` event when the FIFO cap is hit so the PWA can warn.
   */
  appendEvent(id: string, event: CompanionJobEvent): void {
    const job = this.jobs.get(id);
    if (!job) return;
    if (job.events.length >= MAX_RETAINED_EVENTS) {
      job.events.shift();
      if (!job.events.some((e) => e.kind === 'history-truncated')) {
        job.events.push({
          kind: 'history-truncated',
          ordinal: event.ordinal,
          severity: 'warning',
          message: 'Event history was truncated; older events are not available.',
        });
      }
    }
    job.events.push(event);
  }

  /**
   * Return events with ordinal > sinceOrdinal (for replay on reconnect).
   */
  eventsSince(id: string, sinceOrdinal: number): CompanionJobEvent[] {
    const job = this.jobs.get(id);
    if (!job) return [];
    return job.events.filter((e) => e.ordinal > sinceOrdinal);
  }

  /**
   * Mark the job awaiting review + store the result. Terminal happy path.
   */
  complete(id: string, result: {
    proposalCounts: Record<string, number>;
    proposals: CompanionResultProposal[];
    summary: Record<string, unknown>;
  }): void {
    const job = this.jobs.get(id);
    if (!job) return;
    if (isTerminal(job.status)) return;
    job.result = result;
    job.status = 'awaiting_review';
    job.completedAt = new Date().toISOString();
  }

  /** Test-only: reset internal state. */
  _resetForTests(): void {
    this.jobs.clear();
  }

  /** Test-only: inspect internal state. */
  _sizeForTests(): number {
    return this.jobs.size;
  }
}

function isTerminal(status: CompanionJobStatus): boolean {
  return status === 'awaiting_review' || status === 'failed' || status === 'cancelled';
}

function isValidTransition(from: CompanionJobStatus, to: CompanionJobStatus): boolean {
  if (from === to) return true;
  const allowed: Record<CompanionJobStatus, CompanionJobStatus[]> = {
    queued: ['connecting', 'running', 'validating', 'awaiting_review', 'failed', 'cancelled'],
    connecting: ['running', 'validating', 'awaiting_review', 'failed', 'cancelled'],
    running: ['validating', 'awaiting_review', 'failed', 'cancelled'],
    validating: ['awaiting_review', 'failed', 'cancelled'],
    awaiting_review: [],
    failed: [],
    cancelled: [],
  };
  return allowed[from].includes(to);
}

export const jobManager = new JobManager();
export { JobManager, isTerminal as isTerminalStatus, isValidTransition };
