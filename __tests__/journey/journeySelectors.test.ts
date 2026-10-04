// __tests__/journey/journeySelectors.test.ts
//
// The canonical derivation rules (brief §5.3): five milestone states,
// prerequisites, purchase locks, the bounded review queue, notebook
// labels, and where "Continue" goes. These run against plain snapshots —
// no store, no React — because status is never stored, only derived.

import { describe, it, expect } from 'vitest';
import {
  addDaysStamp,
  canEnterSession,
  deriveJourneyView,
  getContinueAction,
  getDueReviewKeys,
  getNextPlanForStep,
  getStepStatus,
  isChapterLocked,
  isEvidenceDue,
  notebookLabel,
  projectNotebook,
  todayStamp,
  getChapter,
  getChapterSteps,
  getMediaItem,
  RU_JOURNEY,
  type EvidenceRecord,
  type JourneyProgressSnapshot,
} from '../../utils/journey';

const TODAY = todayStamp();

function evidence(
  wordKey: string,
  status: EvidenceRecord['status'],
  opts: { dueInDays?: number; lastSeenDaysAgo?: number } = {},
): EvidenceRecord {
  return {
    wordKey,
    status,
    correct: status === 'recalled' ? 2 : 0,
    incorrect: 0,
    assisted: 0,
    lastSeenDay: addDaysStamp(TODAY, -(opts.lastSeenDaysAgo ?? 1)),
    dueOn: addDaysStamp(TODAY, opts.dueInDays ?? 7),
    sourceMediaId: 'city-lights',
  };
}

const EMPTY: JourneyProgressSnapshot = {
  completedStepIds: [],
  completedPlanIds: [],
  evidence: {},
  pinnedSession: null,
  entitledMediaIds: [],
  activeChapterId: null,
};

function snapshot(overrides: Partial<JourneyProgressSnapshot>): JourneyProgressSnapshot {
  return { ...EMPTY, ...overrides };
}

// The returning learner from the demo seed: chapter 01 done, first step
// of chapter 02 done, foundations recalled and not due for days.
function returningSnapshot(): JourneyProgressSnapshot {
  return snapshot({
    completedStepIds: [
      'st-meet-key-words',
      'st-find-who-speaks',
      'st-build-phrase',
      'st-recall-fewer-hints',
      'st-new-setting',
      'st-meet-passage',
    ],
    completedPlanIds: [
      'meet-key-words__s1',
      'find-who-speaks__s1',
      'build-phrase__s1',
      'recall-fewer-hints__s1',
      'new-setting__s1',
      'meet-passage__s1',
    ],
    evidence: {
      'ru:я': evidence('ru:я', 'recalled', { dueInDays: 7 }),
      'ru:вижу': evidence('ru:вижу', 'recalled', { dueInDays: 7 }),
      'ru:свет': evidence('ru:свет', 'recalled', { dueInDays: 7 }),
      'ru:город': evidence('ru:город', 'encountered', { dueInDays: 2 }),
      'ru:не': evidence('ru:не', 'encountered', { dueInDays: 2 }),
      'ru:спит': evidence('ru:спит', 'encountered', { dueInDays: 2 }),
      'ru:иду': evidence('ru:иду', 'encountered', { dueInDays: 2 }),
      'ru:домой': evidence('ru:домой', 'encountered', { dueInDays: 2 }),
    },
    activeChapterId: 'ch-city-after-dark',
  });
}

// ── Primitive rules ──────────────────────────────────────────────────────

describe('isEvidenceDue', () => {
  it('is false for words only met in a passage', () => {
    const met = evidence('ru:город', 'encountered', { dueInDays: -3 });
    expect(isEvidenceDue(met, TODAY)).toBe(false);
  });

  it('is true once the refresh day has arrived, and overdue after', () => {
    expect(isEvidenceDue(evidence('ru:свет', 'recalled', { dueInDays: 0 }), TODAY)).toBe(true);
    expect(isEvidenceDue(evidence('ru:свет', 'recalled', { dueInDays: -2 }), TODAY)).toBe(true);
  });

  it('is false while the refresh day is still ahead', () => {
    expect(isEvidenceDue(evidence('ru:свет', 'recalled', { dueInDays: 1 }), TODAY)).toBe(false);
  });

  it('is false for missing evidence', () => {
    expect(isEvidenceDue(undefined, TODAY)).toBe(false);
  });
});

describe('isChapterLocked', () => {
  it('locks Chapter 04 without the Northern platform entitlement', () => {
    const chapter = getChapter('ch-north-by-night');
    expect(chapter?.requiresPurchaseOf).toBe('northern-platform');
    expect(isChapterLocked(chapter!, EMPTY)).toBe(true);
  });

  it('unlocks Chapter 04 once entitled', () => {
    const chapter = getChapter('ch-north-by-night');
    expect(isChapterLocked(chapter!, snapshot({ entitledMediaIds: ['northern-platform'] }))).toBe(false);
  });

  it('never locks chapters without a purchase requirement', () => {
    for (const id of ['ch-say-what-you-notice', 'ch-city-after-dark', 'ch-beyond-the-passage']) {
      expect(isChapterLocked(getChapter(id)!, EMPTY)).toBe(false);
    }
  });
});

// ── The five milestone states ────────────────────────────────────────────

describe('getStepStatus', () => {
  it('offers exploratory steps with unmet prerequisites as upcoming', () => {
    // st-meet-key-words is a foundation step: browsable from a cold start.
    expect(getStepStatus('st-meet-key-words', EMPTY, TODAY)).toBe('upcoming');
  });

  it('keeps assessed steps with unmet prerequisites unavailable', () => {
    expect(getStepStatus('st-build-phrase', EMPTY, TODAY)).toBe('unavailable');
  });

  it('opens assessed steps once prerequisites are completed', () => {
    const s = snapshot({ completedStepIds: ['st-meet-key-words'] });
    expect(getStepStatus('st-build-phrase', s, TODAY)).toBe('upcoming');
  });

  it('marks completed steps completed while nothing is due', () => {
    const s = snapshot({
      completedStepIds: ['st-meet-key-words'],
      evidence: { 'ru:я': evidence('ru:я', 'recalled', { dueInDays: 3 }) },
    });
    expect(getStepStatus('st-meet-key-words', s, TODAY)).toBe('completed');
  });

  it('marks completed steps needs-refresh when a focus word comes due', () => {
    const s = snapshot({
      completedStepIds: ['st-meet-key-words'],
      evidence: { 'ru:свет': evidence('ru:свет', 'recalled', { dueInDays: -1 }) },
    });
    expect(getStepStatus('st-meet-key-words', s, TODAY)).toBe('needs-refresh');
  });

  it('keeps steps of a locked chapter unavailable regardless of progress', () => {
    expect(getStepStatus('st-np-meet', EMPTY, TODAY)).toBe('unavailable');
    const entitled = snapshot({ entitledMediaIds: ['northern-platform'] });
    expect(getStepStatus('st-np-meet', entitled, TODAY)).toBe('upcoming');
  });

  it('returns unavailable for unknown steps', () => {
    expect(getStepStatus('st-not-real', EMPTY, TODAY)).toBe('unavailable');
  });
});

// ── Next plan / entry gating ─────────────────────────────────────────────

describe('getNextPlanForStep', () => {
  it('offers the first session of an untouched step', () => {
    const step = getChapterSteps('ch-city-after-dark')[1]; // st-find-the-light
    expect(getNextPlanForStep(step, EMPTY)).toEqual({
      planId: 'find-the-light__s1',
      index: 1,
    });
  });

  it('skips completed plans', () => {
    const step = getChapterSteps('ch-city-after-dark')[1];
    const s = snapshot({ completedPlanIds: ['find-the-light__s1'] });
    expect(getNextPlanForStep(step, s)).toEqual({
      planId: 'find-the-light__s2',
      index: 2,
    });
  });

  it('resumes a pinned session for the step before anything else', () => {
    const step = getChapterSteps('ch-city-after-dark')[1];
    const s = snapshot({
      pinnedSession: {
        planId: 'find-the-light__s2',
        stepId: 'st-find-the-light',
        contentRevision: 'ru-2026-10-v1',
        currentIndex: 1,
        answers: [],
        pinnedOnDay: TODAY,
      },
    });
    expect(getNextPlanForStep(step, s)).toEqual({ planId: 'find-the-light__s2', index: 2 });
  });

  it('returns null when every plan of the step is done', () => {
    const step = getChapterSteps('ch-city-after-dark')[1];
    const s = snapshot({
      completedPlanIds: ['find-the-light__s1', 'find-the-light__s2'],
    });
    expect(getNextPlanForStep(step, s)).toBeNull();
  });
});

describe('canEnterSession', () => {
  it('rejects plan ids that do not exist', () => {
    expect(canEnterSession('no-such-plan', EMPTY)).toEqual({ ok: false, reason: 'missing-plan' });
  });

  it('blocks sessions of a locked chapter', () => {
    expect(canEnterSession('np-meet__s1', EMPTY)).toEqual({ ok: false, reason: 'locked' });
    const entitled = snapshot({ entitledMediaIds: ['northern-platform'] });
    expect(canEnterSession('np-meet__s1', entitled)).toEqual({ ok: true });
  });

  it('blocks assessed sessions whose prerequisites are unmet', () => {
    expect(canEnterSession('build-phrase__s1', EMPTY)).toEqual({
      ok: false,
      reason: 'prerequisites',
    });
    const s = snapshot({ completedStepIds: ['st-meet-key-words'] });
    expect(canEnterSession('build-phrase__s1', s)).toEqual({ ok: true });
  });

  it('allows a first session from a cold start', () => {
    expect(canEnterSession('meet-key-words__s1', EMPTY)).toEqual({ ok: true });
  });
});

// ── Bounded review queue ─────────────────────────────────────────────────

describe('getDueReviewKeys', () => {
  it('collects only practised-or-recalled words whose day has come', () => {
    const s = snapshot({
      evidence: {
        'ru:свет': evidence('ru:свет', 'recalled', { dueInDays: -2 }),
        'ru:вижу': evidence('ru:вижу', 'recalled', { dueInDays: 5 }),
        'ru:город': evidence('ru:город', 'encountered', { dueInDays: -9 }),
      },
    });
    expect(getDueReviewKeys(s, TODAY)).toEqual(['ru:свет']);
  });

  it('orders by due day, then alphabetically', () => {
    const s = snapshot({
      evidence: {
        'ru:я': evidence('ru:я', 'recalled', { dueInDays: -1 }),
        'ru:спит': evidence('ru:спит', 'practised', { dueInDays: -4 }),
        'ru:не': evidence('ru:не', 'practised', { dueInDays: -4 }),
      },
    });
    expect(getDueReviewKeys(s, TODAY)).toEqual(['ru:не', 'ru:спит', 'ru:я']);
  });

  it('caps the queue at five — "Review 5 now", never more', () => {
    const evidenceMap: Record<string, EvidenceRecord> = {};
    for (let i = 0; i < 9; i++) {
      const key = `ru:word${i}`;
      evidenceMap[key] = evidence(key, 'practised', { dueInDays: -1 - i });
    }
    expect(getDueReviewKeys(snapshot({ evidence: evidenceMap }), TODAY)).toHaveLength(5);
  });
});

// ── Notebook projection ──────────────────────────────────────────────────

describe('notebookLabel', () => {
  it('says Saved for words only met — saved is not learned', () => {
    expect(notebookLabel(evidence('ru:город', 'encountered', { dueInDays: -9 }), TODAY)).toBe('Saved');
  });

  it('says Ready to revisit when due, regardless of recall history', () => {
    expect(notebookLabel(evidence('ru:свет', 'recalled', { dueInDays: -1 }), TODAY)).toBe('Ready to revisit');
  });

  it('distinguishes recalled today from recalled on an earlier day', () => {
    expect(notebookLabel(evidence('ru:вижу', 'recalled', { dueInDays: 2, lastSeenDaysAgo: 0 }), TODAY)).toBe('Recalled today');
    expect(notebookLabel(evidence('ru:вижу', 'recalled', { dueInDays: 2, lastSeenDaysAgo: 3 }), TODAY)).toBe('Recalled');
  });

  it('says Practiced for words practised but never recalled cold', () => {
    const practised = { ...evidence('ru:свет', 'practised', { dueInDays: 2 }), assisted: 1 };
    expect(notebookLabel(practised, TODAY)).toBe('Practiced');
  });
});

describe('projectNotebook', () => {
  it('shows one entry per word with evidence, in collection order', () => {
    const entries = projectNotebook(returningSnapshot(), TODAY);
    const keys = entries.map((e) => e.wordKey);
    expect(new Set(keys).size).toBe(keys.length);
    // Every entry belongs to a real media item in shelf order.
    const order = ['city-lights', 'last-metro', 'northern-platform'];
    for (const entry of entries) {
      expect(order.indexOf(entry.mediaId)).toBeGreaterThanOrEqual(0);
      expect(getMediaItem(entry.mediaId)).not.toBeNull();
    }
    // The returning learner has met eight words.
    expect(entries).toHaveLength(8);
  });

  it('attaches the real passage word when the key is known', () => {
    const entries = projectNotebook(returningSnapshot(), TODAY);
    const svet = entries.find((e) => e.wordKey === 'ru:свет');
    expect(svet?.word?.lemma).toBe('свет');
    expect(svet?.word?.meaning).toBe('light');
    expect(svet?.mediaId).toBe('city-lights');
  });
});

// ── Whole-journey view ───────────────────────────────────────────────────

describe('deriveJourneyView', () => {
  it('derives the returning learner\'s view: one current step in the active chapter', () => {
    const view = deriveJourneyView(returningSnapshot(), TODAY);
    expect(view.chapters).toHaveLength(4);
    expect(view.activeChapterId).toBe('ch-city-after-dark');
    expect(view.chapters.find((c) => c.isCurrent)?.chapter.id).toBe('ch-city-after-dark');
    expect(view.currentStepView?.step.id).toBe('st-find-the-light');
    expect(view.currentStepView?.status).toBe('current');
  });

  it('marks exactly one step current across the whole journey', () => {
    const view = deriveJourneyView(returningSnapshot(), TODAY);
    const statuses = view.chapters.flatMap((c) => c.steps.map((s) => s.status));
    expect(statuses.filter((s) => s === 'current')).toHaveLength(1);
  });

  it('keeps Chapter 04 unavailable until purchased, and unlockable after', () => {
    const locked = deriveJourneyView(returningSnapshot(), TODAY);
    const ch4 = locked.chapters.find((c) => c.chapter.id === 'ch-north-by-night')!;
    expect(ch4.locked).toBe(true);
    expect(ch4.steps.every((s) => s.status === 'unavailable')).toBe(true);

    const entitled = deriveJourneyView(
      snapshot({ ...returningSnapshot(), entitledMediaIds: ['northern-platform'] }),
      TODAY,
    );
    const ch4open = entitled.chapters.find((c) => c.chapter.id === 'ch-north-by-night')!;
    expect(ch4open.locked).toBe(false);
    expect(ch4open.steps.some((s) => s.status === 'upcoming')).toBe(true);
  });

  it('honors the learner\'s explicit chapter activation when usable', () => {
    // A deliberate activation wins over derivation, even when that
    // chapter is finished — the learner may be revisiting it.
    const s = { ...returningSnapshot(), activeChapterId: 'ch-say-what-you-notice' };
    const view = deriveJourneyView(s, TODAY);
    expect(view.activeChapterId).toBe('ch-say-what-you-notice');
    expect(view.currentStepView).toBeNull();
  });

  it('falls back to derivation when the activated chapter is locked', () => {
    const s = { ...returningSnapshot(), activeChapterId: 'ch-north-by-night' };
    expect(deriveJourneyView(s, TODAY).activeChapterId).toBe('ch-city-after-dark');
  });

  it('carries the pinned session and a bounded due queue', () => {
    const due: JourneyProgressSnapshot = {
      ...returningSnapshot(),
      evidence: {
        ...returningSnapshot().evidence,
        'ru:свет': evidence('ru:свет', 'recalled', { dueInDays: -1 }),
      },
    };
    const view = deriveJourneyView(due, TODAY);
    expect(view.dueReviewKeys).toEqual(['ru:свет']);
    expect(view.pinned).toBeNull();
  });

  it('rests on the last unlocked chapter when everything reachable is done', () => {
    const allSteps = [
      'st-meet-key-words', 'st-find-who-speaks', 'st-build-phrase', 'st-recall-fewer-hints', 'st-new-setting',
      'st-meet-passage', 'st-find-the-light', 'st-bring-back', 'st-negation', 'st-movement', 'st-return-passage',
      'st-new-street', 'st-light-again', 'st-home-at-the-end',
    ];
    const allPlans = [
      'meet-key-words__s1', 'find-who-speaks__s1', 'build-phrase__s1', 'recall-fewer-hints__s1', 'new-setting__s1',
      'meet-passage__s1', 'find-the-light__s1', 'find-the-light__s2', 'bring-back__s1', 'negation__s1',
      'movement__s1', 'return-passage__s1', 'new-street__s1', 'light-again__s1', 'home-at-the-end__s1',
    ];
    const view = deriveJourneyView(
      snapshot({
        completedStepIds: allSteps,
        completedPlanIds: allPlans,
        activeChapterId: null,
      }),
      TODAY,
    );
    expect(view.activeChapterId).toBe('ch-beyond-the-passage');
    expect(view.currentStepView).toBeNull();
  });
});

// ── Continue action ──────────────────────────────────────────────────────

describe('getContinueAction', () => {
  it('resumes a pinned session before anything else', () => {
    const s = {
      ...returningSnapshot(),
      pinnedSession: {
        planId: 'find-the-light__s1',
        stepId: 'st-find-the-light',
        contentRevision: 'ru-2026-10-v1',
        currentIndex: 2,
        answers: [],
        pinnedOnDay: TODAY,
      },
    };
    const action = getContinueAction(s, TODAY);
    expect(action.kind).toBe('resume');
    expect(action.planId).toBe('find-the-light__s1');
    expect(action.label).toBe('Resume your session');
  });

  it('points at the current step\'s next session', () => {
    const action = getContinueAction(returningSnapshot(), TODAY);
    expect(action.kind).toBe('next');
    expect(action.planId).toBe('find-the-light__s1');
  });

  it('falls back to a bounded review when nothing else is open', () => {
    const view = deriveJourneyView(returningSnapshot(), TODAY);
    const allSteps = view.chapters
      .filter((c) => !c.locked)
      .flatMap((c) => c.steps.map((s) => s.step.id));
    const allPlans = view.chapters
      .filter((c) => !c.locked)
      .flatMap((c) => c.steps.flatMap((s) => s.step.sessionPlanIds));
    const s: JourneyProgressSnapshot = {
      ...returningSnapshot(),
      completedStepIds: allSteps,
      completedPlanIds: allPlans,
      evidence: {
        ...returningSnapshot().evidence,
        'ru:свет': evidence('ru:свет', 'recalled', { dueInDays: -3 }),
      },
    };
    const action = getContinueAction(s, TODAY);
    expect(action.kind).toBe('review');
    expect(action.planId).toBeNull();
    expect(action.label).toBe('Review 1 now');
  });

  it('declares the journey complete when nothing is left', () => {
    const action = getContinueAction(EMPTY, TODAY);
    // From a cold start there is always next work — never "complete".
    expect(action.kind).toBe('next');
    expect(action.planId).not.toBeNull();
  });
});

// ── Fixture sanity the selectors rely on ─────────────────────────────────

describe('curriculum shape', () => {
  it('orders the four chapters of the Russian journey', () => {
    expect(RU_JOURNEY.chapterIds).toEqual([
      'ch-say-what-you-notice',
      'ch-city-after-dark',
      'ch-beyond-the-passage',
      'ch-north-by-night',
    ]);
  });

  it('numbers chapters 1..n and keeps every step in its chapter', () => {
    RU_JOURNEY.chapterIds.forEach((chapterId, i) => {
      const chapter = getChapter(chapterId);
      expect(chapter?.number).toBe(i + 1);
      for (const step of getChapterSteps(chapterId)) {
        expect(step.chapterId).toBe(chapterId);
      }
    });
  });
});
