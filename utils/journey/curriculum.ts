// utils/journey/curriculum.ts
//
// The prototype Russian journey: three fixture chapters (plus the
// purchase-locked fourth) with their steps. Deterministic, stable ids.
//
// Chapter 01 — Say what you notice (foundations; completed for the
//              returning demo learner, the fresh learner's entry path)
// Chapter 02 — A city after dark (the City lights song chapter)
// Chapter 03 — Take it beyond the passage (transfer into the prose item)
// Chapter 04 — North by night (unlocked by the demo purchase)
//
// Step statuses are NEVER stored here — selectors derive them from
// progress. Fixture completion lives only in the scenario seeds
// (stores/journeyStore.ts), clearly separate from a new user's history.

import type { Chapter, Journey, JourneyStep } from './types';

export const RU_JOURNEY_ID = 'journey-ru';

export const RU_JOURNEY: Journey = {
  id: RU_JOURNEY_ID,
  language: 'ru',
  languageLabel: 'Russian',
  chapterIds: ['ch-say-what-you-notice', 'ch-city-after-dark', 'ch-beyond-the-passage', 'ch-north-by-night'],
};

// ── Chapter 01 — Say what you notice ─────────────────────────────────────

const CH1_STEPS: JourneyStep[] = [
  {
    id: 'st-meet-key-words',
    chapterId: 'ch-say-what-you-notice',
    kind: 'foundation',
    title: 'Meet the key words',
    purpose: 'Every observation starts with a few small words you’ll reuse forever.',
    mediaId: null,
    estimatedMinutes: 3,
    sessionPlanIds: ['meet-key-words__s1'],
    prerequisiteIds: [],
    assessed: false,
    focusKeys: ['ru:я', 'ru:вижу', 'ru:свет'],
  },
  {
    id: 'st-find-who-speaks',
    chapterId: 'ch-say-what-you-notice',
    kind: 'foundation',
    title: 'Find who is speaking',
    purpose: 'One little word tells you the whole line is about the speaker.',
    mediaId: null,
    estimatedMinutes: 3,
    sessionPlanIds: ['find-who-speaks__s1'],
    prerequisiteIds: [],
    assessed: false,
    focusKeys: ['ru:я'],
  },
  {
    id: 'st-build-phrase',
    chapterId: 'ch-say-what-you-notice',
    kind: 'practice',
    title: 'Build a familiar phrase',
    purpose: 'Put the pieces together into the sentence you’ll meet in the song.',
    mediaId: null,
    estimatedMinutes: 4,
    sessionPlanIds: ['build-phrase__s1'],
    prerequisiteIds: ['st-meet-key-words'],
    assessed: true,
    focusKeys: ['ru:вижу', 'ru:дом'],
  },
  {
    id: 'st-recall-fewer-hints',
    chapterId: 'ch-say-what-you-notice',
    kind: 'practice',
    title: 'Recall with fewer hints',
    purpose: 'The meanings are yours now — check that they come back without help.',
    mediaId: null,
    estimatedMinutes: 3,
    sessionPlanIds: ['recall-fewer-hints__s1'],
    prerequisiteIds: ['st-build-phrase'],
    assessed: true,
    focusKeys: ['ru:я', 'ru:вижу', 'ru:свет'],
  },
  {
    id: 'st-new-setting',
    chapterId: 'ch-say-what-you-notice',
    kind: 'transfer',
    title: 'Use it in a new setting',
    purpose: 'The same words describe the first line of the song you’re heading toward.',
    mediaId: 'city-lights',
    estimatedMinutes: 3,
    sessionPlanIds: ['new-setting__s1'],
    prerequisiteIds: ['st-recall-fewer-hints'],
    assessed: false,
    focusKeys: ['ru:свет'],
  },
];

// ── Chapter 02 — A city after dark ───────────────────────────────────────

const CH2_STEPS: JourneyStep[] = [
  {
    id: 'st-meet-passage',
    chapterId: 'ch-city-after-dark',
    kind: 'explore',
    title: 'Meet the passage',
    purpose: 'Hear the whole verse once, supported, before taking it apart.',
    mediaId: 'city-lights',
    estimatedMinutes: 3,
    sessionPlanIds: ['meet-passage__s1'],
    prerequisiteIds: [],
    assessed: false,
    focusKeys: ['ru:свет', 'ru:не', 'ru:иду'],
  },
  {
    id: 'st-find-the-light',
    chapterId: 'ch-city-after-dark',
    kind: 'practice',
    title: 'Find the light',
    purpose: 'One word makes the first line click — learn it inside the phrase.',
    mediaId: 'city-lights',
    estimatedMinutes: 4,
    sessionPlanIds: ['find-the-light__s1', 'find-the-light__s2'],
    prerequisiteIds: [],
    assessed: true,
    focusKeys: ['ru:свет', 'ru:вижу'],
  },
  {
    id: 'st-bring-back',
    chapterId: 'ch-city-after-dark',
    kind: 'review',
    title: 'Bring these back',
    purpose: 'Two expressions you’ll meet again in this verse.',
    mediaId: null,
    estimatedMinutes: 2,
    sessionPlanIds: ['bring-back__s1'],
    prerequisiteIds: [],
    assessed: false,
    focusKeys: ['ru:свет', 'ru:вижу', 'ru:дом'],
  },
  {
    id: 'st-negation',
    chapterId: 'ch-city-after-dark',
    kind: 'practice',
    title: 'Hear what changes the meaning',
    purpose: 'One small word flips the line about the sleeping city.',
    mediaId: 'city-lights',
    estimatedMinutes: 4,
    sessionPlanIds: ['negation__s1'],
    prerequisiteIds: ['st-find-the-light'],
    assessed: true,
    focusKeys: ['ru:не', 'ru:спит'],
  },
  {
    id: 'st-movement',
    chapterId: 'ch-city-after-dark',
    kind: 'practice',
    title: 'Follow the movement',
    purpose: 'The verse ends by going home — build that line yourself.',
    mediaId: 'city-lights',
    estimatedMinutes: 4,
    sessionPlanIds: ['movement__s1'],
    prerequisiteIds: ['st-find-the-light'],
    assessed: true,
    focusKeys: ['ru:иду', 'ru:домой'],
  },
  {
    id: 'st-return-passage',
    chapterId: 'ch-city-after-dark',
    kind: 'return-to-source',
    title: 'Return to the passage',
    purpose: 'Reread the verse with everything you’ve built — then check your recall.',
    mediaId: 'city-lights',
    estimatedMinutes: 5,
    sessionPlanIds: ['return-passage__s1'],
    prerequisiteIds: ['st-negation', 'st-movement'],
    assessed: true,
    focusKeys: [],
  },
];

// ── Chapter 03 — Take it beyond the passage ──────────────────────────────

const CH3_STEPS: JourneyStep[] = [
  {
    id: 'st-new-street',
    chapterId: 'ch-beyond-the-passage',
    kind: 'explore',
    title: 'A new street',
    purpose: 'A short night ride — the same city speaking somewhere else.',
    mediaId: 'last-metro',
    estimatedMinutes: 3,
    sessionPlanIds: ['new-street__s1'],
    prerequisiteIds: [],
    assessed: false,
    focusKeys: ['ru:метро', 'ru:светит'],
  },
  {
    id: 'st-light-again',
    chapterId: 'ch-beyond-the-passage',
    kind: 'transfer',
    title: 'Recognize the light again',
    purpose: 'Светит is свет doing its work — meet it in a new sentence.',
    mediaId: 'last-metro',
    estimatedMinutes: 3,
    sessionPlanIds: ['light-again__s1'],
    prerequisiteIds: ['st-find-the-light'],
    assessed: true,
    focusKeys: ['ru:светит'],
  },
  {
    id: 'st-home-at-the-end',
    chapterId: 'ch-beyond-the-passage',
    kind: 'transfer',
    title: 'Home at the end',
    purpose: 'The verse’s last line appears word for word — understand it cold.',
    mediaId: 'last-metro',
    estimatedMinutes: 3,
    sessionPlanIds: ['home-at-the-end__s1'],
    prerequisiteIds: ['st-return-passage'],
    assessed: true,
    focusKeys: ['ru:иду', 'ru:домой'],
  },
];

// ── Chapter 04 — North by night (demo purchase unlocks) ──────────────────

const CH4_STEPS: JourneyStep[] = [
  {
    id: 'st-np-meet',
    chapterId: 'ch-north-by-night',
    kind: 'explore',
    title: 'Meet the passage',
    purpose: 'Read the two lines once, supported, before learning them.',
    mediaId: 'northern-platform',
    estimatedMinutes: 3,
    sessionPlanIds: ['np-meet__s1'],
    prerequisiteIds: [],
    assessed: false,
    focusKeys: ['ru:поезд', 'ru:жду'],
  },
  {
    id: 'st-np-train',
    chapterId: 'ch-north-by-night',
    kind: 'practice',
    title: 'The train goes',
    purpose: 'Идёт is иду’s sibling — one ending changes who is going.',
    mediaId: 'northern-platform',
    estimatedMinutes: 4,
    sessionPlanIds: ['np-train__s1'],
    prerequisiteIds: ['st-movement'],
    assessed: true,
    focusKeys: ['ru:поезд', 'ru:идёт'],
  },
  {
    id: 'st-np-waiting',
    chapterId: 'ch-north-by-night',
    kind: 'practice',
    title: 'Waiting on the platform',
    purpose: 'Build the line about waiting, then hear both lines together.',
    mediaId: 'northern-platform',
    estimatedMinutes: 4,
    sessionPlanIds: ['np-waiting__s1'],
    prerequisiteIds: ['st-np-train'],
    assessed: true,
    focusKeys: ['ru:жду', 'ru:платформе'],
  },
];

// ── Chapters ─────────────────────────────────────────────────────────────

export const CHAPTERS: Record<string, Chapter> = {
  'ch-say-what-you-notice': {
    id: 'ch-say-what-you-notice',
    journeyId: RU_JOURNEY_ID,
    number: 1,
    title: 'Say what you notice',
    destination: 'Recognize and say a small set of everyday observation phrases.',
    mediaId: null,
    stepIds: CH1_STEPS.map((s) => s.id),
  },
  'ch-city-after-dark': {
    id: 'ch-city-after-dark',
    journeyId: RU_JOURNEY_ID,
    number: 2,
    title: 'A city after dark',
    destination: 'Understand three lines about light, movement and home.',
    mediaId: 'city-lights',
    stepIds: CH2_STEPS.map((s) => s.id),
    overlapNote: 'Your foundation words — я, вижу, дом — are exactly what this verse uses.',
  },
  'ch-beyond-the-passage': {
    id: 'ch-beyond-the-passage',
    journeyId: RU_JOURNEY_ID,
    number: 3,
    title: 'Take it beyond the passage',
    destination: 'Recognize the verse’s language in another original night scene.',
    mediaId: 'last-metro',
    stepIds: CH3_STEPS.map((s) => s.id),
    overlapNote: 'Свет and домой come back on a night ride — same meanings, new surroundings.',
  },
  'ch-north-by-night': {
    id: 'ch-north-by-night',
    journeyId: RU_JOURNEY_ID,
    number: 4,
    title: 'North by night',
    destination: 'Understand two lines about a night train north.',
    mediaId: 'northern-platform',
    stepIds: CH4_STEPS.map((s) => s.id),
    overlapNote: 'Идёт is the going-word you already know, with a new ending.',
    requiresPurchaseOf: 'northern-platform',
  },
};

const STEPS_BY_ID: Record<string, JourneyStep> = {};
for (const step of [...CH1_STEPS, ...CH2_STEPS, ...CH3_STEPS, ...CH4_STEPS]) {
  STEPS_BY_ID[step.id] = step;
}

export function getChapter(chapterId: string): Chapter | null {
  return CHAPTERS[chapterId] ?? null;
}

export function getStep(stepId: string): JourneyStep | null {
  return STEPS_BY_ID[stepId] ?? null;
}

export function getChapterSteps(chapterId: string): JourneyStep[] {
  const chapter = getChapter(chapterId);
  if (!chapter) return [];
  return chapter.stepIds
    .map((id) => STEPS_BY_ID[id])
    .filter((s): s is JourneyStep => s != null);
}
