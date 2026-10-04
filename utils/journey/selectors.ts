// utils/journey/selectors.ts
//
// Pure derivation over journey progress. Step statuses are NEVER stored —
// every screen asks here, passing a progress snapshot (see JourneyStore).
// Keeping this free of store imports makes the rules unit-testable and
// keeps one canonical definition of "current", "needs refresh" and
// "unavailable" (brief §5.3).

import { RU_JOURNEY, getChapter, getChapterSteps } from './curriculum';
import { MEDIA_ORDER, getMediaItem, mediaWordIndex } from './media';
import { REVIEW_SESSION_CAP, getSessionPlan } from './sessions';
import type {
  Chapter,
  EvidenceRecord,
  Journey,
  JourneyStep,
  PassageWord,
  PinnedSession,
  StepStatus,
} from './types';

// ── Day stamps (local, 'YYYY-MM-DD') ─────────────────────────────────────

export function todayStamp(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysStamp(stamp: string, days: number): string {
  const [y, m, d] = stamp.split('-').map((part) => parseInt(part, 10));
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ── Progress snapshot (the store-facing contract) ────────────────────────

export interface JourneyProgressSnapshot {
  completedStepIds: string[];
  completedPlanIds: string[];
  evidence: Record<string, EvidenceRecord>;
  pinnedSession: PinnedSession | null;
  entitledMediaIds: string[];
  /** Set when the learner explicitly activates a chapter; null = derive. */
  activeChapterId: string | null;
}

// ── Primitive rules ──────────────────────────────────────────────────────

export function isChapterLocked(chapter: Chapter, snapshot: JourneyProgressSnapshot): boolean {
  if (!chapter.requiresPurchaseOf) return false;
  return !snapshot.entitledMediaIds.includes(chapter.requiresPurchaseOf);
}

/** A practised word whose refresh day has arrived. */
export function isEvidenceDue(evidence: EvidenceRecord | undefined, today: string): boolean {
  if (!evidence) return false;
  if (evidence.status === 'encountered') return false;
  return evidence.dueOn <= today;
}

function prerequisitesMet(step: JourneyStep, snapshot: JourneyProgressSnapshot): boolean {
  return step.prerequisiteIds.every((id) => snapshot.completedStepIds.includes(id));
}

/** Status for a step in isolation (current-marking happens per journey). */
export function getStepStatus(
  stepId: string,
  snapshot: JourneyProgressSnapshot,
  today: string,
): StepStatus {
  const step = getStepById(stepId);
  if (!step) return 'unavailable';
  const chapter = getChapter(step.chapterId);
  if (!chapter) return 'unavailable';
  if (isChapterLocked(chapter, snapshot)) return 'unavailable';

  const completed = snapshot.completedStepIds.includes(step.id);
  if (completed) {
    const due = step.focusKeys.some((key) => isEvidenceDue(snapshot.evidence[key], today));
    return due ? 'needs-refresh' : 'completed';
  }

  // Assessed practice gates on prerequisites; exploratory steps stay browsable.
  if (!prerequisitesMet(step, snapshot) && step.assessed) return 'unavailable';

  return 'upcoming';
}

function getStepById(stepId: string): JourneyStep | null {
  for (const chapterId of RU_JOURNEY.chapterIds) {
    for (const step of getChapterSteps(chapterId)) {
      if (step.id === stepId) return step;
    }
  }
  return null;
}

/** First session plan of a step that isn't finished yet (1-based index). */
export function getNextPlanForStep(
  step: JourneyStep,
  snapshot: JourneyProgressSnapshot,
): { planId: string; index: number } | null {
  // A pinned session for this step resumes first.
  if (snapshot.pinnedSession && step.sessionPlanIds.includes(snapshot.pinnedSession.planId)) {
    const pinnedIndex = step.sessionPlanIds.indexOf(snapshot.pinnedSession.planId);
    return { planId: snapshot.pinnedSession.planId, index: pinnedIndex + 1 };
  }
  for (let i = 0; i < step.sessionPlanIds.length; i++) {
    const planId = step.sessionPlanIds[i];
    if (!snapshot.completedPlanIds.includes(planId)) {
      return { planId, index: i + 1 };
    }
  }
  return null;
}

/** Whether a session may open right now (locks and prerequisites). */
export function canEnterSession(
  planId: string,
  snapshot: JourneyProgressSnapshot,
): { ok: true } | { ok: false; reason: 'missing-plan' | 'locked' | 'prerequisites' } {
  const plan = getSessionPlan(planId);
  if (!plan) return { ok: false, reason: 'missing-plan' };
  if (plan.stepId) {
    const step = getStepById(plan.stepId);
    const chapter = step ? getChapter(step.chapterId) : null;
    if (step && chapter && isChapterLocked(chapter, snapshot)) return { ok: false, reason: 'locked' };
    if (step && step.assessed && !prerequisitesMet(step, snapshot)) {
      return { ok: false, reason: 'prerequisites' };
    }
  }
  return { ok: true };
}

// ── Review queue (bounded, "Review 5 now") ───────────────────────────────

export function getDueReviewKeys(
  snapshot: JourneyProgressSnapshot,
  today: string,
  cap: number = REVIEW_SESSION_CAP,
): string[] {
  return Object.values(snapshot.evidence)
    .filter((record) => isEvidenceDue(record, today))
    .sort((a, b) => (a.dueOn === b.dueOn ? a.wordKey.localeCompare(b.wordKey) : a.dueOn.localeCompare(b.dueOn)))
    .slice(0, cap)
    .map((record) => record.wordKey);
}

// ── Notebook projection ──────────────────────────────────────────────────

export type NotebookLabel = 'Recalled today' | 'Ready to revisit' | 'Recalled' | 'Practiced' | 'Saved';

export interface NotebookEntry {
  wordKey: PassageWord['wordKey'];
  word: PassageWord | null;
  evidence: EvidenceRecord;
  label: NotebookLabel;
  /** Why the label is what it is — one quiet sentence. */
  note: string;
  mediaId: string;
}

const NOTEBOOK_LABEL_NOTES: Record<NotebookLabel, string> = {
  'Recalled today': 'Came back today without help.',
  'Ready to revisit': 'Due for a look — that’s all it means.',
  Recalled: 'Recalled without help; kept for later.',
  Practiced: 'Practised in a session — not yet recalled cold.',
  Saved: 'Met in a passage. Saved here — not learned yet.',
};

export function notebookLabel(evidence: EvidenceRecord, today: string): NotebookLabel {
  if (evidence.status === 'encountered') return 'Saved';
  if (isEvidenceDue(evidence, today)) return 'Ready to revisit';
  if (evidence.status === 'recalled') {
    return evidence.lastSeenDay === today ? 'Recalled today' : 'Recalled';
  }
  return 'Practiced';
}

/** One entry per word with evidence, in first-appearance order across the
 *  collection. Saved ≠ learned — 'Saved' entries say so outright. */
export function projectNotebook(
  snapshot: JourneyProgressSnapshot,
  today: string,
): NotebookEntry[] {
  const entries: NotebookEntry[] = [];
  const seen = new Set<string>();
  for (const mediaId of MEDIA_ORDER) {
    const media = getMediaItem(mediaId);
    if (!media) continue;
    const index = mediaWordIndex(media);
    for (const [wordKey, hit] of Object.entries(index)) {
      const evidence = snapshot.evidence[wordKey];
      if (!evidence) continue;
      // One entry per word, wherever it was first met — a word shared
      // across passages appears once, under its first media home.
      if (seen.has(wordKey)) continue;
      seen.add(wordKey);
      const label = notebookLabel(evidence, today);
      entries.push({
        wordKey,
        word: hit.word,
        evidence,
        label,
        note: NOTEBOOK_LABEL_NOTES[label],
        mediaId,
      });
    }
  }
  return entries;
}

// ── Whole-journey view (what the Journey screen renders) ─────────────────

export interface StepView {
  step: JourneyStep;
  status: StepStatus;
  planCount: number;
  /** First unfinished plan, or null when the step is done. */
  nextPlanId: string | null;
  /** 1-based position of nextPlanId among the step's sessions. */
  nextPlanIndex: number;
  resumePlanId: string | null;
}

export interface ChapterView {
  chapter: Chapter;
  locked: boolean;
  isCurrent: boolean;
  completedSteps: number;
  totalSteps: number;
  steps: StepView[];
}

export interface JourneyView {
  journey: Journey;
  chapters: ChapterView[];
  activeChapterId: string;
  currentStepView: StepView | null;
  dueReviewKeys: string[];
  pinned: PinnedSession | null;
}

function buildStepView(step: JourneyStep, status: StepStatus, snapshot: JourneyProgressSnapshot): StepView {
  const next = getNextPlanForStep(step, snapshot);
  const pinnedResumesHere =
    snapshot.pinnedSession != null && step.sessionPlanIds.includes(snapshot.pinnedSession.planId);
  return {
    step,
    status,
    planCount: step.sessionPlanIds.length,
    nextPlanId: status === 'completed' ? null : (next?.planId ?? null),
    nextPlanIndex: next?.index ?? 1,
    resumePlanId: pinnedResumesHere ? snapshot.pinnedSession?.planId ?? null : null,
  };
}

/** The canonical derivation: one active chapter, one current step, five
 *  milestone states, bounded review queue, pinned session. */
export function deriveJourneyView(
  snapshot: JourneyProgressSnapshot,
  today: string,
): JourneyView {
  // Pass 1 — base status per step, and lock state per chapter.
  const chapterViews: (ChapterView & { rawStatuses: Map<string, StepStatus> })[] = [];
  for (const chapterId of RU_JOURNEY.chapterIds) {
    const chapter = getChapter(chapterId);
    if (!chapter) continue;
    const locked = isChapterLocked(chapter, snapshot);
    const rawStatuses = new Map<string, StepStatus>();
    const steps: StepView[] = getChapterSteps(chapterId).map((step) => {
      const status = locked ? 'unavailable' : getStepStatus(step.id, snapshot, today);
      rawStatuses.set(step.id, status);
      return buildStepView(step, status, snapshot);
    });
    chapterViews.push({
      chapter,
      locked,
      isCurrent: false,
      completedSteps: steps.filter((s) => s.status === 'completed' || s.status === 'needs-refresh').length,
      totalSteps: steps.length,
      steps,
      rawStatuses,
    });
  }

  // Active chapter: the learner's explicit activation wins if it is
  // usable; otherwise the first chapter with unfinished available work.
  let activeChapterId: string | null = null;
  if (snapshot.activeChapterId) {
    const candidate = chapterViews.find((c) => c.chapter.id === snapshot.activeChapterId);
    if (candidate && !candidate.locked) activeChapterId = candidate.chapter.id;
  }
  if (!activeChapterId) {
    for (const view of chapterViews) {
      const hasOpenWork = view.steps.some(
        (s) => s.status === 'upcoming' || s.status === 'needs-refresh',
      );
      if (hasOpenWork && !view.locked) {
        activeChapterId = view.chapter.id;
        break;
      }
    }
  }
  if (!activeChapterId) {
    // Everything reachable is done — rest on the last unlocked chapter.
    const lastOpen = [...chapterViews].reverse().find((c) => !c.locked);
    activeChapterId = lastOpen?.chapter.id ?? RU_JOURNEY.chapterIds[0];
  }

  // Pass 2 — exactly one 'current' across the journey: the first
  // available, unfinished step of the active chapter.
  const activeView = chapterViews.find((c) => c.chapter.id === activeChapterId);
  let currentStepView: StepView | null = null;
  if (activeView) {
    activeView.isCurrent = true;
    const firstOpen = activeView.steps.find(
      (s) => s.status === 'upcoming' || s.status === 'needs-refresh',
    );
    if (firstOpen) {
      firstOpen.status = 'current';
      currentStepView = firstOpen;
    }
  }

  return {
    journey: RU_JOURNEY,
    chapters: chapterViews.map(({ rawStatuses: _raw, ...rest }) => rest),
    activeChapterId,
    currentStepView,
    dueReviewKeys: getDueReviewKeys(snapshot, today),
    pinned: snapshot.pinnedSession,
  };
}

/** Where "Continue" should go: an in-flight pinned session, else the
 *  current step's next session, else a bounded review when one is due. */
export function getContinueAction(
  snapshot: JourneyProgressSnapshot,
  today: string,
): { kind: 'resume' | 'next' | 'review'; planId: string | null; label: string } {
  const view = deriveJourneyView(snapshot, today);
  if (view.pinned) {
    return { kind: 'resume', planId: view.pinned.planId, label: 'Resume your session' };
  }
  if (view.currentStepView?.nextPlanId) {
    return {
      kind: 'next',
      planId: view.currentStepView.nextPlanId,
      label: view.currentStepView.step.title,
    };
  }
  if (view.dueReviewKeys.length > 0) {
    return { kind: 'review', planId: null, label: `Review ${view.dueReviewKeys.length} now` };
  }
  return { kind: 'next', planId: null, label: 'Journey complete' };
}
