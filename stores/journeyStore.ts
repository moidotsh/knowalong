// stores/journeyStore.ts
// // d10-exempt: learner-journey demo store — data + actions only, no
// loading/error/modal/selection/UI state. Follows the lessonProgressStore
// persistence pattern (Zustand + persist + zustandStorage).
//
// The whole consumer-experience prototype lives in this ONE namespace
// ('knowalong-journey-v1'): journey progress, knowledge evidence, the
// pinned session, demo entitlements, collection drafts and demo prefs.
// The legacy Night Metro stores are untouched; "Reset demo" clears only
// this namespace, never the operator's existing state.
//
// Scenario seeds (brief §16): the dev picker (app/dev/journey) swaps the
// seed wholesale — a fresh learner never inherits the returning learner's
// history. Seed completion is DATA here; step statuses stay derived in
// utils/journey/selectors.ts.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import zustandStorage from './storage';
import {
  canonicalMediaForWord,
  getStep,
  resolveSessionPlan,
  knownLineIndex,
  addDaysStamp,
  todayStamp,
  type JourneyProgressSnapshot,
  type EvidenceRecord,
  type EvidenceStatus,
  type PinnedSession,
  type PinnedSessionAnswer,
  type SessionActivity,
  type SessionPlan,
} from '../utils/journey';

// ── Types ────────────────────────────────────────────────────────────────

/** The demo learner states the dev picker can put the app in. */
export type JourneyScenario =
  | 'returning'
  | 'fresh'
  | 'review-due'
  | 'resumed-session'
  | 'completed-chapter'
  | 'preparing'
  | 'partial'
  | 'error'
  | 'offline'
  | 'no-audio'
  | 'demo-purchase';

export const JOURNEY_SCENARIOS: JourneyScenario[] = [
  'returning',
  'fresh',
  'review-due',
  'resumed-session',
  'completed-chapter',
  'preparing',
  'partial',
  'error',
  'offline',
  'no-audio',
  'demo-purchase',
];

/** Per-language progress — everything the selectors need. */
export interface LangProgress {
  completedStepIds: string[];
  completedPlanIds: string[];
  evidence: Record<string, EvidenceRecord>;
  pinnedSession: PinnedSession | null;
  entitledMediaIds: string[];
  /** Set when the learner activates a chapter; null = derive. */
  activeChapterId: string | null;
}

/** A saved-but-not-necessarily-prepared collection item (pasted text). */
export interface DraftItem {
  id: string;
  title: string;
  createdAtDay: string;
  text: string;
  lineCount: number;
  /** Fixture line ids matched by trimmed text — the only word support
   *  a draft can honestly claim. */
  matchedLineIds: string[];
  status: 'draft' | 'preparing' | 'ready' | 'partial' | 'failed';
  /** 0–2 while preparing (three simulated stages). */
  stage: number;
  failedStage: number | null;
  note?: string;
}

export interface JourneyPrefs {
  /** 'off' = the honest "audio isn't available here" state, no pretending. */
  audioSimulation: 'auto' | 'off';
  offlineSimulation: boolean;
}

export type OnboardingSource = 'song' | 'language';

export interface JourneyDataState {
  scenario: JourneyScenario;
  /** Bump to invalidate pinned sessions when session content changes. */
  contentRevision: string;
  language: string;
  progress: Record<string, LangProgress>;
  onboarding: { completed: boolean; source: OnboardingSource | null };
  drafts: DraftItem[];
  prefs: JourneyPrefs;
}

export interface JourneyState extends JourneyDataState {
  // SECTION: Data
  // (all data lives in JourneyDataState above)

  // SECTION: Actions
  applyScenario: (scenario: JourneyScenario) => void;
  resetDemo: () => void;
  completeOnboarding: (source: OnboardingSource) => void;
  pinSession: (planId: string) => void;
  setPinnedProgress: (planId: string, currentIndex: number, answer?: PinnedSessionAnswer) => void;
  discardPinnedSession: () => void;
  completeSession: (plan: SessionPlan, answers: PinnedSessionAnswer[]) => void;
  purchaseMedia: (mediaId: string) => void;
  activateChapter: (chapterId: string) => void;
  addDraft: (text: string, title?: string) => string;
  startPreparation: (draftId: string) => void;
  /** One simulated preparation stage; finishing resolves ready/partial. */
  advancePreparation: (draftId: string) => void;
  cancelPreparation: (draftId: string) => void;
  retryPreparation: (draftId: string) => void;
  removeDraft: (draftId: string) => void;
  setAudioSimulation: (mode: JourneyPrefs['audioSimulation']) => void;
  setOfflineSimulation: (on: boolean) => void;

  // SECTION: Computed
  /** The selectors' input contract for the active language. */
  selectSnapshot: () => JourneyProgressSnapshot;
}

// ── Empty/seed helpers ───────────────────────────────────────────────────

export const JOURNEY_CONTENT_REVISION = 'ru-2026-10-v1';

function emptyProgress(): LangProgress {
  return {
    completedStepIds: [],
    completedPlanIds: [],
    evidence: {},
    pinnedSession: null,
    entitledMediaIds: [],
    activeChapterId: null,
  };
}

/** The selectors' snapshot for possibly-missing progress. */
export function toSnapshot(progress: LangProgress | undefined): JourneyProgressSnapshot {
  const p = progress ?? emptyProgress();
  return {
    completedStepIds: p.completedStepIds,
    completedPlanIds: p.completedPlanIds,
    evidence: p.evidence,
    pinnedSession: p.pinnedSession,
    entitledMediaIds: p.entitledMediaIds,
    activeChapterId: p.activeChapterId,
  };
}

const STATUS_ORDER: Record<EvidenceStatus, number> = {
  encountered: 0,
  practised: 1,
  recalled: 2,
};

function seedEvidence(
  wordKey: string,
  status: EvidenceStatus,
  opts: { correct?: number; incorrect?: number; assisted?: number; lastSeenDaysAgo?: number; dueInDays?: number } = {},
): EvidenceRecord {
  const today = todayStamp();
  return {
    wordKey,
    status,
    correct: opts.correct ?? 0,
    incorrect: opts.incorrect ?? 0,
    assisted: opts.assisted ?? 0,
    lastSeenDay: addDaysStamp(today, -(opts.lastSeenDaysAgo ?? 0)),
    dueOn: addDaysStamp(today, opts.dueInDays ?? 2),
    sourceMediaId: canonicalMediaForWord(wordKey) ?? 'city-lights',
  };
}

function seedEvidenceMap(entries: EvidenceRecord[]): Record<string, EvidenceRecord> {
  const map: Record<string, EvidenceRecord> = {};
  for (const record of entries) map[record.wordKey] = record;
  return map;
}

// ── Scenario seeds ───────────────────────────────────────────────────────
// One function per seed, built fresh at call time so day stamps stay
// honest relative to "today". A seed REPLACES the whole demo namespace.

const CH1_STEPS = [
  'st-meet-key-words',
  'st-find-who-speaks',
  'st-build-phrase',
  'st-recall-fewer-hints',
  'st-new-setting',
];
const CH1_PLANS = [
  'meet-key-words__s1',
  'find-who-speaks__s1',
  'build-phrase__s1',
  'recall-fewer-hints__s1',
  'new-setting__s1',
];
const CH2_ALL_STEPS = [
  'st-meet-passage',
  'st-find-the-light',
  'st-bring-back',
  'st-negation',
  'st-movement',
  'st-return-passage',
];
const CH2_ALL_PLANS = [
  'meet-passage__s1',
  'find-the-light__s1',
  'find-the-light__s2',
  'bring-back__s1',
  'negation__s1',
  'movement__s1',
  'return-passage__s1',
];

/** Foundation words known by the returning learner, in good shape. */
function returningEvidence(): Record<string, EvidenceRecord> {
  return seedEvidenceMap([
    seedEvidence('ru:я', 'recalled', { correct: 3, lastSeenDaysAgo: 3, dueInDays: 7 }),
    seedEvidence('ru:вижу', 'recalled', { correct: 3, lastSeenDaysAgo: 3, dueInDays: 7 }),
    seedEvidence('ru:свет', 'recalled', { correct: 2, lastSeenDaysAgo: 3, dueInDays: 7 }),
    // Met during "Meet the passage" — saved, not practised yet.
    seedEvidence('ru:город', 'encountered', { lastSeenDaysAgo: 1, dueInDays: 2 }),
    seedEvidence('ru:не', 'encountered', { lastSeenDaysAgo: 1, dueInDays: 2 }),
    seedEvidence('ru:спит', 'encountered', { lastSeenDaysAgo: 1, dueInDays: 2 }),
    seedEvidence('ru:иду', 'encountered', { lastSeenDaysAgo: 1, dueInDays: 2 }),
    seedEvidence('ru:домой', 'encountered', { lastSeenDaysAgo: 1, dueInDays: 2 }),
  ]);
}

function returningProgress(): LangProgress {
  return {
    completedStepIds: [...CH1_STEPS, 'st-meet-passage'],
    completedPlanIds: [...CH1_PLANS, 'meet-passage__s1'],
    evidence: returningEvidence(),
    pinnedSession: null,
    entitledMediaIds: [],
    activeChapterId: 'ch-city-after-dark',
  };
}

function draftFromText(id: string, text: string, overrides: Partial<DraftItem> = {}): DraftItem {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const known = knownLineIndex();
  const matchedLineIds = lines
    .map((line) => known[line]?.lineId)
    .filter((lineId): lineId is string => lineId != null);
  const base: DraftItem = {
    id,
    title: 'Pasted text',
    createdAtDay: todayStamp(),
    text,
    lineCount: lines.length,
    matchedLineIds,
    status: 'draft',
    stage: 0,
    failedStage: null,
  };
  return { ...base, ...overrides };
}

const SAMPLE_LINES = 'Я вижу свет.\nГород не спит.\nЯ иду домой.';

function buildScenarioState(scenario: JourneyScenario): JourneyDataState {
  const base: JourneyDataState = {
    scenario,
    contentRevision: JOURNEY_CONTENT_REVISION,
    language: 'ru',
    progress: { ru: returningProgress() },
    onboarding: { completed: true, source: 'song' },
    drafts: [],
    prefs: { audioSimulation: 'auto', offlineSimulation: false },
  };

  switch (scenario) {
    case 'fresh': {
      return {
        ...base,
        progress: { ru: emptyProgress() },
        onboarding: { completed: false, source: null },
      };
    }
    case 'review-due': {
      // Same learner, but свет and вижу have drifted past their refresh day.
      const evidence = returningEvidence();
      evidence['ru:свет'] = {
        ...evidence['ru:свет'],
        lastSeenDay: addDaysStamp(todayStamp(), -12),
        dueOn: addDaysStamp(todayStamp(), -2),
      };
      evidence['ru:вижу'] = {
        ...evidence['ru:вижу'],
        lastSeenDay: addDaysStamp(todayStamp(), -10),
        dueOn: addDaysStamp(todayStamp(), -1),
      };
      return {
        ...base,
        progress: { ru: { ...returningProgress(), evidence } },
      };
    }
    case 'resumed-session': {
      const pinned: LangProgress['pinnedSession'] = {
        planId: 'find-the-light__s1',
        stepId: 'st-find-the-light',
        contentRevision: JOURNEY_CONTENT_REVISION,
        currentIndex: 2,
        answers: [{ activityId: 'ftl1-choice-1', outcome: 'correct', assisted: false }],
        pinnedOnDay: todayStamp(),
      };
      return {
        ...base,
        progress: { ru: { ...returningProgress(), pinnedSession: pinned } },
      };
    }
    case 'completed-chapter': {
      const progress: LangProgress = {
        completedStepIds: [...CH1_STEPS, ...CH2_ALL_STEPS],
        completedPlanIds: [...CH1_PLANS, ...CH2_ALL_PLANS],
        evidence: seedEvidenceMap([
          seedEvidence('ru:я', 'recalled', { correct: 4, lastSeenDaysAgo: 2, dueInDays: 8 }),
          seedEvidence('ru:вижу', 'recalled', { correct: 4, lastSeenDaysAgo: 2, dueInDays: 8 }),
          seedEvidence('ru:свет', 'recalled', { correct: 4, lastSeenDaysAgo: 2, dueInDays: 8 }),
          seedEvidence('ru:город', 'recalled', { correct: 3, lastSeenDaysAgo: 2, dueInDays: 8 }),
          seedEvidence('ru:не', 'recalled', { correct: 3, lastSeenDaysAgo: 2, dueInDays: 8 }),
          seedEvidence('ru:спит', 'recalled', { correct: 3, lastSeenDaysAgo: 2, dueInDays: 8 }),
          seedEvidence('ru:иду', 'recalled', { correct: 3, lastSeenDaysAgo: 2, dueInDays: 8 }),
          seedEvidence('ru:домой', 'recalled', { correct: 3, lastSeenDaysAgo: 2, dueInDays: 8 }),
        ]),
        pinnedSession: null,
        entitledMediaIds: [],
        activeChapterId: 'ch-beyond-the-passage',
      };
      return { ...base, progress: { ru: progress } };
    }
    case 'preparing': {
      return {
        ...base,
        drafts: [
          draftFromText('draft-sample-prep', SAMPLE_LINES, { status: 'preparing', stage: 1 }),
        ],
      };
    }
    case 'partial': {
      return {
        ...base,
        drafts: [
          draftFromText('draft-partial', 'Я вижу свет.\nНочной ветер тих.\nГород не спит.', {
            title: 'Night notes',
            status: 'partial',
          }),
        ],
      };
    }
    case 'error': {
      return {
        ...base,
        drafts: [
          draftFromText('draft-failed', SAMPLE_LINES, { status: 'failed', failedStage: 1 }),
        ],
      };
    }
    case 'offline': {
      return { ...base, prefs: { ...base.prefs, offlineSimulation: true } };
    }
    case 'no-audio': {
      return { ...base, prefs: { ...base.prefs, audioSimulation: 'off' } };
    }
    case 'demo-purchase': {
      const progress = returningProgress();
      progress.entitledMediaIds = ['northern-platform'];
      return { ...base, progress: { ru: progress } };
    }
    case 'returning':
    default:
      return base;
  }
}

// ── Evidence update rules (session completion) ───────────────────────────

function activityWordKeys(activity: SessionActivity): string[] {
  switch (activity.kind) {
    case 'phrase-reveal':
      return activity.wordKeys;
    case 'meaning-choice':
      return activity.wordKey ? [activity.wordKey] : [];
    case 'phrase-builder':
      return activity.wordKeys;
    case 'passage-return':
      return activity.highlightWordKeys;
    case 'recap':
      return [];
  }
}

function mergeEvidence(
  existing: EvidenceRecord | undefined,
  wordKey: string,
  activity: SessionActivity,
  answer: PinnedSessionAnswer | undefined,
  today: string,
): EvidenceRecord {
  const base: EvidenceRecord =
    existing ??
    {
      wordKey,
      status: 'encountered',
      correct: 0,
      incorrect: 0,
      assisted: 0,
      lastSeenDay: today,
      dueOn: addDaysStamp(today, 2),
      sourceMediaId: canonicalMediaForWord(wordKey) ?? 'city-lights',
    };

  const scored = activity.kind === 'meaning-choice' || activity.kind === 'phrase-builder';
  if (!scored) {
    // Encounters (reveals, returns) touch the word without judging it.
    return { ...base, lastSeenDay: today };
  }

  const outcome = answer?.outcome ?? 'skipped';
  switch (outcome) {
    case 'correct': {
      const recalled = !answer?.assisted;
      return {
        ...base,
        status: recalled ? 'recalled' : 'practised',
        correct: base.correct + 1,
        assisted: answer?.assisted ? base.assisted + 1 : base.assisted,
        lastSeenDay: today,
        dueOn: addDaysStamp(today, recalled ? 9 : 2),
      };
    }
    case 'incorrect':
      return {
        ...base,
        status: 'practised',
        incorrect: base.incorrect + 1,
        lastSeenDay: today,
        dueOn: addDaysStamp(today, 2),
      };
    case 'revealed':
      return {
        ...base,
        status: 'practised',
        assisted: base.assisted + 1,
        lastSeenDay: today,
        dueOn: addDaysStamp(today, 2),
      };
    case 'skipped':
    default:
      // Moved on without answering — seen, not judged.
      return { ...base, lastSeenDay: today };
  }
}

// ── The store ────────────────────────────────────────────────────────────

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      // SECTION: Data
      scenario: 'returning',
      contentRevision: JOURNEY_CONTENT_REVISION,
      language: 'ru',
      progress: { ru: emptyProgress() },
      onboarding: { completed: false, source: null },
      drafts: [],
      prefs: { audioSimulation: 'auto', offlineSimulation: false },

      // SECTION: Actions
      applyScenario: (scenario) => set(buildScenarioState(scenario)),

      resetDemo: () => set(buildScenarioState('returning')),

      completeOnboarding: (source) =>
        set({ onboarding: { completed: true, source } }),

      pinSession: (planId) => {
        // resolveSessionPlan (not the registry) so bounded-review ids pin too.
        const plan = resolveSessionPlan(planId);
        if (!plan) return;
        const lang = get().language;
        const progress = get().progress[lang] ?? emptyProgress();
        if (progress.pinnedSession?.planId === planId) return;
        const pinned: LangProgress['pinnedSession'] = {
          planId,
          stepId: plan.stepId,
          contentRevision: get().contentRevision,
          currentIndex: 0,
          answers: [],
          pinnedOnDay: todayStamp(),
        };
        set({
          progress: { ...get().progress, [lang]: { ...progress, pinnedSession: pinned } },
        });
      },

      setPinnedProgress: (planId, currentIndex, answer) => {
        const lang = get().language;
        const progress = get().progress[lang] ?? emptyProgress();
        const pinned = progress.pinnedSession;
        if (!pinned || pinned.planId !== planId) return;
        const answers = answer
          ? [...pinned.answers.filter((a) => a.activityId !== answer.activityId), answer]
          : pinned.answers;
        set({
          progress: {
            ...get().progress,
            [lang]: { ...progress, pinnedSession: { ...pinned, currentIndex, answers } },
          },
        });
      },

      discardPinnedSession: () => {
        const lang = get().language;
        const progress = get().progress[lang] ?? emptyProgress();
        if (!progress.pinnedSession) return;
        set({
          progress: { ...get().progress, [lang]: { ...progress, pinnedSession: null } },
        });
      },

      completeSession: (plan, answers) => {
        const lang = get().language;
        const progress = get().progress[lang] ?? emptyProgress();
        if (progress.completedPlanIds.includes(plan.id)) return;

        const today = todayStamp();
        const byActivity = new Map(answers.map((a) => [a.activityId, a]));
        const evidence = { ...progress.evidence };
        for (const activity of plan.activities) {
          for (const wordKey of activityWordKeys(activity)) {
            evidence[wordKey] = mergeEvidence(
              evidence[wordKey],
              wordKey,
              activity,
              byActivity.get(activity.id),
              today,
            );
          }
        }

        const completedPlanIds = [...new Set([...progress.completedPlanIds, plan.id])];
        const completedStepIds = [...progress.completedStepIds];
        if (plan.stepId && !completedStepIds.includes(plan.stepId)) {
          const step = getStep(plan.stepId);
          if (step && step.sessionPlanIds.every((id) => completedPlanIds.includes(id))) {
            completedStepIds.push(plan.stepId);
          }
        }

        set({
          progress: {
            ...get().progress,
            [lang]: {
              ...progress,
              evidence,
              completedPlanIds,
              completedStepIds,
              pinnedSession: null,
            },
          },
        });
      },

      purchaseMedia: (mediaId) => {
        const lang = get().language;
        const progress = get().progress[lang] ?? emptyProgress();
        if (progress.entitledMediaIds.includes(mediaId)) return;
        set({
          progress: {
            ...get().progress,
            [lang]: { ...progress, entitledMediaIds: [...progress.entitledMediaIds, mediaId] },
          },
        });
      },

      activateChapter: (chapterId) => {
        const lang = get().language;
        const progress = get().progress[lang] ?? emptyProgress();
        set({
          progress: {
            ...get().progress,
            [lang]: { ...progress, activeChapterId: chapterId },
          },
        });
      },

      addDraft: (text, title) => {
        const id = `draft-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
        const draft = draftFromText(id, text, title ? { title } : {});
        set({ drafts: [draft, ...get().drafts] });
        return id;
      },

      startPreparation: (draftId) => {
        set({
          drafts: get().drafts.map((draft) =>
            draft.id === draftId
              ? { ...draft, status: 'preparing', stage: 0, failedStage: null, note: undefined }
              : draft,
          ),
        });
      },

      advancePreparation: (draftId) => {
        const { prefs } = get();
        set({
          drafts: get().drafts.map((draft) => {
            if (draft.id !== draftId || draft.status !== 'preparing') return draft;
            // Offline (simulated) preparation fails at the reading stage —
            // the honest failure path, retryable.
            if (prefs.offlineSimulation && draft.stage === 1) {
              return { ...draft, status: 'failed', failedStage: 1 };
            }
            if (draft.stage < 2) return { ...draft, stage: draft.stage + 1 };
            const fullMatch =
              draft.matchedLineIds.length > 0 && draft.matchedLineIds.length === draft.lineCount;
            return { ...draft, status: fullMatch ? 'ready' : 'partial' };
          }),
        });
      },

      cancelPreparation: (draftId) => {
        set({
          drafts: get().drafts.map((draft) =>
            draft.id === draftId
              ? { ...draft, status: 'draft', stage: 0, failedStage: null }
              : draft,
          ),
        });
      },

      retryPreparation: (draftId) => {
        set({
          drafts: get().drafts.map((draft) =>
            draft.id === draftId
              ? { ...draft, status: 'preparing', stage: 0, failedStage: null }
              : draft,
          ),
        });
      },

      removeDraft: (draftId) => {
        set({ drafts: get().drafts.filter((draft) => draft.id !== draftId) });
      },

      setAudioSimulation: (mode) => set({ prefs: { ...get().prefs, audioSimulation: mode } }),

      setOfflineSimulation: (on) => set({ prefs: { ...get().prefs, offlineSimulation: on } }),

      // SECTION: Computed
      selectSnapshot: () => toSnapshot(get().progress[get().language]),
    }),
    {
      name: 'knowalong-journey-v1',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s: JourneyState) => ({
        scenario: s.scenario,
        contentRevision: s.contentRevision,
        language: s.language,
        progress: s.progress,
        onboarding: s.onboarding,
        drafts: s.drafts,
        prefs: s.prefs,
      }),
    },
  ),
);

export default useJourneyStore;
