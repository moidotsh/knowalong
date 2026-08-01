// utils/knowalong/fixtures/learnerPath.ts
//
// Prototype learner state — mock mastery, stats, + streak for the home
// dashboard + progress page. No live DB; these fixtures drive the UI.

export type MasteryState = 'mastered' | 'in-progress' | 'locked';

export interface PathConcept {
  code: string;
  surfaceForm: string;
  meaning: string;
  emoji: string;
  tier: number;
  state: MasteryState;
}

export interface PathTier {
  tier: number;
  label: string;
  concepts: PathConcept[];
}

export const LEARNING_PATH: readonly PathTier[] = [
  {
    tier: 0,
    label: 'Foundations',
    concepts: [
      { code: '1', surfaceForm: 'я', meaning: 'I', emoji: '🧑', tier: 0, state: 'mastered' },
      { code: '2', surfaceForm: 'я вижу', meaning: 'I see', emoji: '👀', tier: 0, state: 'mastered' },
      { code: '3', surfaceForm: 'я знаю', meaning: 'I know', emoji: '🧠', tier: 0, state: 'mastered' },
      { code: '4', surfaceForm: 'я хочу', meaning: 'I want', emoji: '🤲', tier: 0, state: 'in-progress' },
    ],
  },
  {
    tier: 1,
    label: 'Daily Life',
    concepts: [
      { code: '5', surfaceForm: 'я иду', meaning: 'I am going', emoji: '🚶', tier: 1, state: 'in-progress' },
      { code: '6', surfaceForm: 'я живу', meaning: 'I live', emoji: '🏠', tier: 1, state: 'locked' },
      { code: '7', surfaceForm: 'мне нравится', meaning: 'I like', emoji: '❤️', tier: 1, state: 'locked' },
    ],
  },
  {
    tier: 2,
    label: 'Expressions',
    concepts: [
      { code: '8', surfaceForm: 'я не знаю', meaning: "I don't know", emoji: '🤷', tier: 2, state: 'locked' },
      { code: '9', surfaceForm: 'я вижу море', meaning: 'I see the sea', emoji: '🌊', tier: 2, state: 'locked' },
      { code: '10', surfaceForm: 'я хочу чай', meaning: 'I want tea', emoji: '🍵', tier: 2, state: 'locked' },
    ],
  },
] as const;

export interface LearnerStats {
  conceptsMastered: number;
  conceptsTotal: number;
  streakDays: number;
  accuracyPct: number;
  sessionsCompleted: number;
  minutesStudied: number;
}

export const LEARNER_STATS: LearnerStats = {
  conceptsMastered: 3,
  conceptsTotal: 10,
  streakDays: 7,
  accuracyPct: 85,
  sessionsCompleted: 12,
  minutesStudied: 47,
};

/** 7-day streak calendar (1 = studied, 0 = missed). Last entry = today. */
export const STREAK_CALENDAR: number[] = [1, 1, 0, 1, 1, 1, 1];

export interface NextAction {
  label: string;
  subtitle: string;
  emoji: string;
  route: string;
}

export const NEXT_ACTION: NextAction = {
  label: 'я хочу',
  subtitle: 'Continue learning "I want"',
  emoji: '🤲',
  route: '/study',
};
