// __tests__/journey/journeyStore.test.ts
//
// The persisted demo store: pinning/exit-resume, session completion
// evidence rules (brief §7 — first outcome stands, help amends, no
// punishment), entitlement, honest preparation states, and scenario
// resets. Runs against the real store; AsyncStorage is mocked in setup
// and returns null, so no stale state ever rehydrates mid-test.

import { beforeEach, describe, it, expect } from 'vitest';
import { useJourneyStore } from '../../stores/journeyStore';
import {
  buildBoundedReviewPlan,
  getSessionPlan,
  isChapterLocked,
  todayStamp,
  getChapter,
  type SessionPlan,
} from '../../utils/journey';

const TODAY = todayStamp();

function state() {
  return useJourneyStore.getState();
}

function lang() {
  return useJourneyStore.getState().progress[useJourneyStore.getState().language]!;
}

beforeEach(() => {
  state().applyScenario('returning');
});

// ── Scenario seeds ───────────────────────────────────────────────────────

describe('scenarios', () => {
  it('seeds the returning learner: chapter 01 done, chapter 02 active', () => {
    const snapshot = state().selectSnapshot();
    expect(snapshot.completedStepIds).toContain('st-meet-key-words');
    expect(snapshot.completedStepIds).toContain('st-meet-passage');
    expect(snapshot.activeChapterId).toBe('ch-city-after-dark');
    expect(snapshot.entitledMediaIds).toEqual([]);
  });

  it('seeds fresh as an un-onboarded empty learner', () => {
    state().applyScenario('fresh');
    expect(state().onboarding.completed).toBe(false);
    expect(state().selectSnapshot().completedStepIds).toEqual([]);
  });

  it('seeds review-due with свет past its refresh day', () => {
    state().applyScenario('review-due');
    const snapshot = state().selectSnapshot();
    expect(snapshot.evidence['ru:свет']!.dueOn <= TODAY).toBe(true);
  });

  it('seeds demo-purchase with Northern platform entitled', () => {
    state().applyScenario('demo-purchase');
    expect(state().selectSnapshot().entitledMediaIds).toEqual(['northern-platform']);
    expect(isChapterLocked(getChapter('ch-north-by-night')!, state().selectSnapshot())).toBe(false);
  });

  it('resets to the returning learner', () => {
    state().applyScenario('fresh');
    state().resetDemo();
    expect(state().scenario).toBe('returning');
    expect(state().onboarding.completed).toBe(true);
    expect(state().selectSnapshot().completedStepIds.length).toBeGreaterThan(0);
  });

  it('replaces drafts and prefs wholesale on scenario change', () => {
    state().addDraft('Я вижу свет.', 'Stray note');
    state().setOfflineSimulation(true);
    state().applyScenario('partial');
    expect(state().drafts).toHaveLength(1);
    expect(state().drafts[0]!.status).toBe('partial');
    expect(state().prefs.offlineSimulation).toBe(false);
  });
});

// ── Onboarding ───────────────────────────────────────────────────────────

describe('onboarding', () => {
  it('records which door the learner came in through', () => {
    state().applyScenario('fresh');
    expect(state().onboarding.completed).toBe(false);
    state().completeOnboarding('language');
    expect(state().onboarding).toEqual({ completed: true, source: 'language' });
  });
});

// ── Pinning / exit-resume ────────────────────────────────────────────────

describe('pinned sessions', () => {
  it('pins a registered plan with the current content revision', () => {
    state().pinSession('find-the-light__s1');
    const pinned = lang().pinnedSession;
    expect(pinned?.planId).toBe('find-the-light__s1');
    expect(pinned?.stepId).toBe('st-find-the-light');
    expect(pinned?.contentRevision).toBe(state().contentRevision);
    expect(pinned?.currentIndex).toBe(0);
    expect(pinned?.answers).toEqual([]);
  });

  it('pins bounded-review ids too — the review re-pins after exit', () => {
    const plan = buildBoundedReviewPlan(['ru:свет', 'ru:вижу'])!;
    state().pinSession(plan.id);
    expect(lang().pinnedSession?.planId).toBe(plan.id);
  });

  it('ignores unknown plan ids', () => {
    state().pinSession('no-such-plan');
    expect(lang().pinnedSession).toBeNull();
  });

  it('does not clobber progress when the same plan re-pins', () => {
    state().pinSession('find-the-light__s1');
    state().setPinnedProgress('find-the-light__s1', 3, {
      activityId: 'ftl1-choice-1',
      outcome: 'correct',
      assisted: false,
    });
    state().pinSession('find-the-light__s1');
    const pinned = lang().pinnedSession!;
    expect(pinned.currentIndex).toBe(3);
    expect(pinned.answers).toHaveLength(1);
  });

  it('records one answer per activity, keeping the latest', () => {
    state().pinSession('find-the-light__s1');
    state().setPinnedProgress('find-the-light__s1', 2, {
      activityId: 'ftl1-choice-1',
      outcome: 'incorrect',
      assisted: false,
    });
    state().setPinnedProgress('find-the-light__s1', 3, {
      activityId: 'ftl1-choice-1',
      outcome: 'correct',
      assisted: true,
    });
    const pinned = lang().pinnedSession!;
    expect(pinned.answers).toHaveLength(1);
    expect(pinned.answers[0]).toEqual({
      activityId: 'ftl1-choice-1',
      outcome: 'correct',
      assisted: true,
    });
    expect(pinned.currentIndex).toBe(3);
  });

  it('ignores progress updates for a different plan', () => {
    state().pinSession('find-the-light__s1');
    state().setPinnedProgress('meet-key-words__s1', 9);
    expect(lang().pinnedSession!.planId).toBe('find-the-light__s1');
    expect(lang().pinnedSession!.currentIndex).toBe(0);
  });

  it('clears the pin when the learner exits without saving', () => {
    state().pinSession('find-the-light__s1');
    state().discardPinnedSession();
    expect(lang().pinnedSession).toBeNull();
  });
});

// ── Completion → evidence rules ──────────────────────────────────────────

function answersFor(plan: SessionPlan): { activityId: string; outcome: 'correct' | 'incorrect' | 'revealed' | 'skipped'; assisted: boolean }[] {
  return plan.activities.map((activity) => {
    if (activity.kind === 'meaning-choice') {
      return { activityId: activity.id, outcome: 'correct' as const, assisted: false };
    }
    if (activity.kind === 'phrase-builder') {
      return { activityId: activity.id, outcome: 'correct' as const, assisted: false };
    }
    return { activityId: activity.id, outcome: 'skipped' as const, assisted: false };
  });
}

describe('completeSession', () => {
  it('records a cold correct answer as recalled, due back in nine days', () => {
    state().applyScenario('fresh');
    const plan = getSessionPlan('meet-key-words__s1')!;
    state().completeSession(plan, answersFor(plan));
    const svet = state().selectSnapshot().evidence['ru:свет']!;
    expect(svet.status).toBe('recalled');
    expect(svet.correct).toBeGreaterThanOrEqual(1);
    expect(svet.dueOn).toBe(todayStampPlus(9));
  });

  it('counts help-assisted correct answers as practised, never recall', () => {
    state().applyScenario('fresh');
    const plan = getSessionPlan('meet-key-words__s1')!;
    const answers = answersFor(plan).map((a) =>
      a.outcome === 'correct' ? { ...a, assisted: true } : a,
    );
    state().completeSession(plan, answers);
    const svet = state().selectSnapshot().evidence['ru:свет']!;
    expect(svet.status).toBe('practised');
    expect(svet.assisted).toBeGreaterThanOrEqual(1);
    expect(svet.dueOn).toBe(todayStampPlus(2));
  });

  it('marks incorrect answers practised with a sooner refresh', () => {
    state().applyScenario('fresh');
    const plan = getSessionPlan('meet-key-words__s1')!;
    const answers = plan.activities.map((activity) => {
      if (activity.kind === 'meaning-choice' || activity.kind === 'phrase-builder') {
        return { activityId: activity.id, outcome: 'incorrect' as const, assisted: false };
      }
      return { activityId: activity.id, outcome: 'skipped' as const, assisted: false };
    });
    state().completeSession(plan, answers);
    const svet = state().selectSnapshot().evidence['ru:свет']!;
    expect(svet.status).toBe('practised');
    expect(svet.incorrect).toBeGreaterThanOrEqual(1);
  });

  it('lets reveals and returns touch a word without judging it', () => {
    state().applyScenario('fresh');
    const plan = getSessionPlan('meet-passage__s1')!;
    const answers = plan.activities.map((activity) => ({
      activityId: activity.id,
      outcome: 'skipped' as const,
      assisted: false,
    }));
    state().completeSession(plan, answers);
    const snapshot = state().selectSnapshot().evidence;
    // Words met here were new — they stay Saved, not practised.
    expect(snapshot['ru:город']!.status).toBe('encountered');
    expect(snapshot['ru:город']!.lastSeenDay).toBe(TODAY);
  });

  it('completes a step only when every one of its plans is done', () => {
    state().applyScenario('fresh');
    const s1 = getSessionPlan('find-the-light__s1')!;
    state().completeSession(s1, answersFor(s1));
    expect(state().selectSnapshot().completedStepIds).not.toContain('st-find-the-light');
    const s2 = getSessionPlan('find-the-light__s2')!;
    state().completeSession(s2, answersFor(s2));
    expect(state().selectSnapshot().completedStepIds).toContain('st-find-the-light');
  });

  it('clears the pin when the session completes', () => {
    // Use a plan the returning learner has not finished yet — completing
    // an already-completed plan is a no-op by design.
    state().pinSession('find-the-light__s1');
    const plan = getSessionPlan('find-the-light__s1')!;
    state().completeSession(plan, answersFor(plan));
    expect(lang().pinnedSession).toBeNull();
  });

  it('is idempotent — replaying a finished plan changes nothing', () => {
    state().applyScenario('fresh');
    const plan = getSessionPlan('meet-key-words__s1')!;
    state().completeSession(plan, answersFor(plan));
    const before = lang();
    state().completeSession(plan, answersFor(plan));
    expect(lang()).toEqual(before);
  });
});

function todayStampPlus(days: number): string {
  const [y, m, d] = TODAY.split('-').map((p) => parseInt(p, 10));
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ── Entitlement ──────────────────────────────────────────────────────────

describe('entitlement', () => {
  it('records a demo purchase once and unlocks Chapter 04', () => {
    expect(isChapterLocked(getChapter('ch-north-by-night')!, state().selectSnapshot())).toBe(true);
    state().purchaseMedia('northern-platform');
    expect(state().selectSnapshot().entitledMediaIds).toEqual(['northern-platform']);
    state().purchaseMedia('northern-platform');
    expect(state().selectSnapshot().entitledMediaIds).toHaveLength(1);
    expect(isChapterLocked(getChapter('ch-north-by-night')!, state().selectSnapshot())).toBe(false);
  });
});

// ── Chapter activation ───────────────────────────────────────────────────

describe('activateChapter', () => {
  it('records the learner\'s explicit choice', () => {
    state().activateChapter('ch-beyond-the-passage');
    expect(state().selectSnapshot().activeChapterId).toBe('ch-beyond-the-passage');
  });
});

// ── Draft preparation (honest simulation) ────────────────────────────────

describe('draft preparation', () => {
  it('saves pasted text as a draft with only real line matches', () => {
    const id = state().addDraft('Я вижу свет.\nСовсем другой текст.', 'Night notes');
    const draft = state().drafts.find((d) => d.id === id)!;
    expect(draft.status).toBe('draft');
    expect(draft.lineCount).toBe(2);
    expect(draft.matchedLineIds).toHaveLength(1);
  });

  it('walks a fully matched draft to ready through three stages', () => {
    const id = state().addDraft('Я вижу свет.\nГород не спит.\nЯ иду домой.');
    state().startPreparation(id);
    expect(state().drafts.find((d) => d.id === id)!.status).toBe('preparing');
    state().advancePreparation(id);
    state().advancePreparation(id);
    state().advancePreparation(id);
    expect(state().drafts.find((d) => d.id === id)!.status).toBe('ready');
  });

  it('lands a partly matched draft on partial, not a fake success', () => {
    const id = state().addDraft('Я вижу свет.\nSomething unrelated.');
    state().startPreparation(id);
    state().advancePreparation(id);
    state().advancePreparation(id);
    state().advancePreparation(id);
    expect(state().drafts.find((d) => d.id === id)!.status).toBe('partial');
  });

  it('fails honestly offline at the reading stage, and retries', () => {
    state().setOfflineSimulation(true);
    const id = state().addDraft('Я вижу свет.\nГород не спит.\nЯ иду домой.');
    state().startPreparation(id);
    state().advancePreparation(id);
    state().advancePreparation(id); // offline: fails at stage 1
    const failed = state().drafts.find((d) => d.id === id)!;
    expect(failed.status).toBe('failed');
    expect(failed.failedStage).toBe(1);

    state().setOfflineSimulation(false);
    state().retryPreparation(id);
    expect(state().drafts.find((d) => d.id === id)!.status).toBe('preparing');
    state().advancePreparation(id);
    state().advancePreparation(id);
    state().advancePreparation(id);
    expect(state().drafts.find((d) => d.id === id)!.status).toBe('ready');
  });

  it('cancels back to an unstarted draft', () => {
    const id = state().addDraft('Я вижу свет.');
    state().startPreparation(id);
    state().cancelPreparation(id);
    const draft = state().drafts.find((d) => d.id === id)!;
    expect(draft.status).toBe('draft');
    expect(draft.stage).toBe(0);
  });

  it('removes a draft entirely', () => {
    const id = state().addDraft('Я вижу свет.');
    state().removeDraft(id);
    expect(state().drafts.find((d) => d.id === id)).toBeUndefined();
  });
});
