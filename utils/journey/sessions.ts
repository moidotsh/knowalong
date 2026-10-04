// utils/journey/sessions.ts
//
// The one session player's authored plans. Every session referenced by a
// journey step exists here, written out activity by activity — nothing is
// generated at runtime and nothing is random, so a session replays
// identically after an exit/resume.
//
// Session shape (brief §7): encounter → recognize → build/retrieve →
// return to the passage → recap. Checked activities say so explicitly in
// the UI; reveals, returns and recaps are never scored. Each card keeps
// at most one not-yet-met element — distractors are drawn from words the
// learner has already met wherever possible.

import type { SessionPlan } from './types';

export const CITY_LIGHTS_SOURCE = 'City lights — Verse 1';
export const NORTHERN_SOURCE = 'Northern platform — Verse 1';
export const METRO_SOURCE = 'Last metro home';
export const FOUNDATIONS_SOURCE = 'Chapter 01 — Foundations';

// ── Chapter 01 · Say what you notice ─────────────────────────────────────

const MEET_KEY_WORDS_S1: SessionPlan = {
  id: 'meet-key-words__s1',
  stepId: 'st-meet-key-words',
  kind: 'step',
  title: 'Meet the key words',
  sourceLabel: FOUNDATIONS_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'mkw-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Я',
      meaning: 'I — the person speaking',
      transliteration: 'ya',
      focus: 'One small word tells you the whole line is about the speaker.',
      wordKeys: ['ru:я'],
      unscored: true,
    },
    {
      id: 'mkw-reveal-2',
      kind: 'phrase-reveal',
      phrase: 'вижу',
      meaning: '(I) see',
      transliteration: 'vizhu',
      focus: 'A doing word. The -у ending says “I” am the one doing it.',
      wordKeys: ['ru:вижу'],
      unscored: true,
    },
    {
      id: 'mkw-reveal-3',
      kind: 'phrase-reveal',
      phrase: 'свет',
      meaning: 'light',
      transliteration: 'svet',
      focus: 'A naming word — the thing the speaker notices.',
      wordKeys: ['ru:свет'],
      unscored: true,
    },
    {
      id: 'mkw-choice-1',
      kind: 'meaning-choice',
      prompt: 'Which meaning does свет carry?',
      phrase: 'Я вижу свет.',
      options: [
        { id: 'opt-1', text: 'light' },
        { id: 'opt-2', text: 'sleeps' },
        { id: 'opt-3', text: 'home(ward)' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'свет is light — the thing the speaker sees. вижу says “(I) see”.',
      wordKey: 'ru:свет',
      sourceLineId: 'cl-l1',
      unscored: false,
    },
    {
      id: 'mkw-build-1',
      kind: 'phrase-builder',
      prompt: 'I see a light.',
      chips: [
        { id: 'chip-1', text: 'Я', correctPosition: 0 },
        { id: 'chip-2', text: 'вижу', correctPosition: 1 },
        { id: 'chip-3', text: 'свет', correctPosition: 2 },
        { id: 'chip-4', text: 'домой', correctPosition: null },
      ],
      answer: ['Я', 'вижу', 'свет'],
      translation: 'Я вижу свет.',
      sourceLineId: 'cl-l1',
      wordKeys: ['ru:я', 'ru:вижу', 'ru:свет'],
      unscored: false,
    },
    {
      id: 'mkw-recap-1',
      kind: 'recap',
      practised: [
        'Met three small words: я, вижу, свет',
        'Checked свет’s meaning against its line',
        'Built «Я вижу свет» yourself',
      ],
      uncertain: 'домой is waiting in the song ahead — it isn’t yours yet.',
      unscored: true,
    },
  ],
};

const FIND_WHO_SPEAKS_S1: SessionPlan = {
  id: 'find-who-speaks__s1',
  stepId: 'st-find-who-speaks',
  kind: 'step',
  title: 'Find who is speaking',
  sourceLabel: FOUNDATIONS_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'fws-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Я вижу',
      meaning: 'I see',
      transliteration: 'ya vizhu',
      focus: 'When the speaker points at themselves, я comes first.',
      wordKeys: ['ru:я', 'ru:вижу'],
      unscored: true,
    },
    {
      id: 'fws-choice-1',
      kind: 'meaning-choice',
      prompt: 'Who is this line about?',
      phrase: 'Я иду домой.',
      options: [
        { id: 'opt-1', text: 'The speaker — “I”' },
        { id: 'opt-2', text: 'The city' },
        { id: 'opt-3', text: 'Someone else — “they”' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'я opens the line — the speaker is walking home and says so.',
      wordKey: 'ru:я',
      sourceLineId: 'cl-l3',
      unscored: false,
    },
    {
      id: 'fws-build-1',
      kind: 'phrase-builder',
      prompt: 'I see.',
      chips: [
        { id: 'chip-1', text: 'Я', correctPosition: 0 },
        { id: 'chip-2', text: 'вижу', correctPosition: 1 },
        { id: 'chip-3', text: 'свет', correctPosition: null },
      ],
      answer: ['Я', 'вижу'],
      translation: 'Я вижу.',
      sourceLineId: 'cl-l1',
      wordKeys: ['ru:я', 'ru:вижу'],
      unscored: false,
    },
    {
      id: 'fws-recap-1',
      kind: 'recap',
      practised: ['Found я doing its job in two lines', 'Said «Я вижу» without help'],
      unscored: true,
    },
  ],
};

const BUILD_PHRASE_S1: SessionPlan = {
  id: 'build-phrase__s1',
  stepId: 'st-build-phrase',
  kind: 'step',
  title: 'Build a familiar phrase',
  sourceLabel: FOUNDATIONS_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'bp-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Я вижу свет.',
      meaning: 'I see a light.',
      transliteration: 'Ya vizhu svet.',
      focus: 'The whole line at once — you already own all three words in it.',
      wordKeys: ['ru:я', 'ru:вижу', 'ru:свет'],
      sourceLineId: 'cl-l1',
      unscored: true,
    },
    {
      id: 'bp-choice-1',
      kind: 'meaning-choice',
      prompt: 'What does the whole line say?',
      phrase: 'Я вижу свет.',
      options: [
        { id: 'opt-1', text: 'I see a light.' },
        { id: 'opt-2', text: 'The city isn’t sleeping.' },
        { id: 'opt-3', text: 'I’m going home.' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'вижу — (I) see; свет — light. The other two lines are still ahead of you.',
      sourceLineId: 'cl-l1',
      unscored: false,
    },
    {
      id: 'bp-build-1',
      kind: 'phrase-builder',
      prompt: 'I see a light.',
      chips: [
        { id: 'chip-1', text: 'Я', correctPosition: 0 },
        { id: 'chip-2', text: 'вижу', correctPosition: 1 },
        { id: 'chip-3', text: 'свет', correctPosition: 2 },
        { id: 'chip-4', text: 'домой', correctPosition: null },
      ],
      answer: ['Я', 'вижу', 'свет'],
      translation: 'Я вижу свет.',
      sourceLineId: 'cl-l1',
      wordKeys: ['ru:я', 'ru:вижу', 'ru:свет'],
      unscored: false,
    },
    {
      id: 'bp-recap-1',
      kind: 'recap',
      practised: ['Checked the line’s meaning', 'Built «Я вижу свет» from pieces'],
      uncertain: 'This is a checked step — it counts toward the chapter.',
      unscored: true,
    },
  ],
};

const RECALL_FEWER_HINTS_S1: SessionPlan = {
  id: 'recall-fewer-hints__s1',
  stepId: 'st-recall-fewer-hints',
  kind: 'step',
  title: 'Recall with fewer hints',
  sourceLabel: FOUNDATIONS_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'rfh-choice-1',
      kind: 'meaning-choice',
      prompt: 'No line to lean on — what does свет mean?',
      phrase: 'свет',
      options: [
        { id: 'opt-1', text: 'light' },
        { id: 'opt-2', text: 'city' },
        { id: 'opt-3', text: 'home(ward)' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'свет — light, on its own.',
      wordKey: 'ru:свет',
      unscored: false,
    },
    {
      id: 'rfh-choice-2',
      kind: 'meaning-choice',
      prompt: 'And вижу?',
      phrase: 'вижу',
      options: [
        { id: 'opt-1', text: '(I) see' },
        { id: 'opt-2', text: '(I) am going' },
        { id: 'opt-3', text: 'sleeps' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'вижу — (I) see. The -у ending keeps saying “I”.',
      wordKey: 'ru:вижу',
      unscored: false,
    },
    {
      id: 'rfh-build-1',
      kind: 'phrase-builder',
      prompt: 'I see a light.',
      chips: [
        { id: 'chip-1', text: 'Я', correctPosition: 0 },
        { id: 'chip-2', text: 'вижу', correctPosition: 1 },
        { id: 'chip-3', text: 'свет', correctPosition: 2 },
        { id: 'chip-4', text: 'домой', correctPosition: null },
      ],
      answer: ['Я', 'вижу', 'свет'],
      translation: 'Я вижу свет.',
      sourceLineId: 'cl-l1',
      wordKeys: ['ru:я', 'ru:вижу', 'ru:свет'],
      unscored: false,
    },
    {
      id: 'rfh-recap-1',
      kind: 'recap',
      practised: ['Recalled свет and вижу without the line in front of you'],
      unscored: true,
    },
  ],
};

const NEW_SETTING_S1: SessionPlan = {
  id: 'new-setting__s1',
  stepId: 'st-new-setting',
  kind: 'transfer',
  title: 'Use it in a new setting',
  sourceLabel: CITY_LIGHTS_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'ns-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Я вижу свет.',
      meaning: 'I see a light.',
      transliteration: 'Ya vizhu svet.',
      focus: 'Line 1 of City lights — the sentence you built, now in its home.',
      wordKeys: ['ru:я', 'ru:вижу', 'ru:свет'],
      sourceLineId: 'cl-l1',
      unscored: true,
    },
    {
      id: 'ns-choice-1',
      kind: 'meaning-choice',
      prompt: 'In the song, what does the speaker see?',
      phrase: 'Я вижу свет.',
      options: [
        { id: 'opt-1', text: 'A light' },
        { id: 'opt-2', text: 'A train' },
        { id: 'opt-3', text: 'The metro' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'свет — a light. The city around it is still dark.',
      wordKey: 'ru:свет',
      sourceLineId: 'cl-l1',
      unscored: false,
    },
    {
      id: 'ns-return-1',
      kind: 'passage-return',
      mediaId: 'city-lights',
      passageId: 'cl-verse-1',
      lineIds: ['cl-l1'],
      highlightWordKeys: ['ru:свет'],
      note: 'The word you learned, where it lives.',
      unscored: true,
    },
    {
      id: 'ns-recap-1',
      kind: 'recap',
      practised: ['Met your sentence inside the song it belongs to'],
      unscored: true,
    },
  ],
};

// ── Chapter 02 · A city after dark ───────────────────────────────────────

const MEET_PASSAGE_S1: SessionPlan = {
  id: 'meet-passage__s1',
  stepId: 'st-meet-passage',
  kind: 'step',
  title: 'Meet the passage',
  sourceLabel: CITY_LIGHTS_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'mp-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Я вижу свет.',
      meaning: 'I see a light.',
      transliteration: 'Ya vizhu svet.',
      focus: 'The line you built in Chapter 01 — you already know every word.',
      wordKeys: ['ru:я', 'ru:вижу', 'ru:свет'],
      sourceLineId: 'cl-l1',
      unscored: true,
    },
    {
      id: 'mp-reveal-2',
      kind: 'phrase-reveal',
      phrase: 'Город не спит.',
      meaning: 'The city isn’t sleeping.',
      transliteration: 'Gorod ne spit.',
      focus: 'не flips the doing word — the city is not sleeping.',
      wordKeys: ['ru:город', 'ru:не', 'ru:спит'],
      sourceLineId: 'cl-l2',
      unscored: true,
    },
    {
      id: 'mp-reveal-3',
      kind: 'phrase-reveal',
      phrase: 'Я иду домой.',
      meaning: 'I’m going home.',
      transliteration: 'Ya idu domoy.',
      focus: 'иду — am going (on foot); домой — homeward.',
      wordKeys: ['ru:я', 'ru:иду', 'ru:домой'],
      sourceLineId: 'cl-l3',
      unscored: true,
    },
    {
      id: 'mp-return-1',
      kind: 'passage-return',
      mediaId: 'city-lights',
      passageId: 'cl-verse-1',
      lineIds: ['cl-l1', 'cl-l2', 'cl-l3'],
      highlightWordKeys: ['ru:свет', 'ru:не', 'ru:иду'],
      note: 'Three lines, three things to notice: light, the flip, the going.',
      unscored: true,
    },
    {
      id: 'mp-recap-1',
      kind: 'recap',
      practised: ['Met the whole verse once, line by line'],
      uncertain: 'Nothing is checked yet — the next steps take the verse apart.',
      unscored: true,
    },
  ],
};

const FIND_THE_LIGHT_S1: SessionPlan = {
  id: 'find-the-light__s1',
  stepId: 'st-find-the-light',
  kind: 'step',
  title: 'Find the light',
  sourceLabel: CITY_LIGHTS_SOURCE,
  sequenceIndex: 1,
  sessionCount: 2,
  activities: [
    {
      id: 'ftl1-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'свет',
      meaning: 'light',
      transliteration: 'svet',
      focus: 'The thing the speaker sees — one sound, easy to keep.',
      wordKeys: ['ru:свет'],
      sourceLineId: 'cl-l1',
      unscored: true,
    },
    {
      id: 'ftl1-choice-1',
      kind: 'meaning-choice',
      prompt: 'What does свет mean?',
      phrase: 'Я вижу свет.',
      options: [
        { id: 'opt-1', text: 'light' },
        { id: 'opt-2', text: 'city' },
        { id: 'opt-3', text: 'home(ward)' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'свет — light. Город — the city; домой — homeward.',
      wordKey: 'ru:свет',
      sourceLineId: 'cl-l1',
      unscored: false,
    },
    {
      id: 'ftl1-build-1',
      kind: 'phrase-builder',
      prompt: 'I see a light.',
      chips: [
        { id: 'chip-1', text: 'Я', correctPosition: 0 },
        { id: 'chip-2', text: 'вижу', correctPosition: 1 },
        { id: 'chip-3', text: 'свет', correctPosition: 2 },
        { id: 'chip-4', text: 'Город', correctPosition: null },
      ],
      answer: ['Я', 'вижу', 'свет'],
      translation: 'Я вижу свет.',
      sourceLineId: 'cl-l1',
      wordKeys: ['ru:я', 'ru:вижу', 'ru:свет'],
      unscored: false,
    },
    {
      id: 'ftl1-return-1',
      kind: 'passage-return',
      mediaId: 'city-lights',
      passageId: 'cl-verse-1',
      lineIds: ['cl-l1'],
      highlightWordKeys: ['ru:свет'],
      note: 'свет, in place — the line now points at something.',
      unscored: true,
    },
    {
      id: 'ftl1-recap-1',
      kind: 'recap',
      practised: ['Checked свет inside its line', 'Built the line around it'],
      uncertain: 'Session 2 of this step takes вижу the same way.',
      unscored: true,
    },
  ],
};

const FIND_THE_LIGHT_S2: SessionPlan = {
  id: 'find-the-light__s2',
  stepId: 'st-find-the-light',
  kind: 'step',
  title: 'Find the light',
  sourceLabel: CITY_LIGHTS_SOURCE,
  sequenceIndex: 2,
  sessionCount: 2,
  activities: [
    {
      id: 'ftl2-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'вижу',
      meaning: '(I) see',
      transliteration: 'vizhu',
      focus: 'The -у ending again: I am the one seeing.',
      wordKeys: ['ru:вижу'],
      sourceLineId: 'cl-l1',
      unscored: true,
    },
    {
      id: 'ftl2-choice-1',
      kind: 'meaning-choice',
      prompt: 'In this line, what does вижу say?',
      phrase: 'Я вижу свет.',
      options: [
        { id: 'opt-1', text: '(I) see' },
        { id: 'opt-2', text: 'sleeps' },
        { id: 'opt-3', text: 'is going' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'вижу — (I) see. спит belongs to the sleeping city, not here.',
      wordKey: 'ru:вижу',
      sourceLineId: 'cl-l1',
      unscored: false,
    },
    {
      id: 'ftl2-build-1',
      kind: 'phrase-builder',
      prompt: 'I see.',
      chips: [
        { id: 'chip-1', text: 'Я', correctPosition: 0 },
        { id: 'chip-2', text: 'вижу', correctPosition: 1 },
        { id: 'chip-3', text: 'Спит', correctPosition: null },
      ],
      answer: ['Я', 'вижу'],
      translation: 'Я вижу.',
      sourceLineId: 'cl-l1',
      wordKeys: ['ru:я', 'ru:вижу'],
      unscored: false,
    },
    {
      id: 'ftl2-return-1',
      kind: 'passage-return',
      mediaId: 'city-lights',
      passageId: 'cl-verse-1',
      lineIds: ['cl-l1'],
      highlightWordKeys: ['ru:вижу', 'ru:свет'],
      note: 'Both words together — the noticing line, complete.',
      unscored: true,
    },
    {
      id: 'ftl2-recap-1',
      kind: 'recap',
      practised: ['Checked вижу inside its line', 'Said «Я вижу» from pieces'],
      unscored: true,
    },
  ],
};

const BRING_BACK_S1: SessionPlan = {
  id: 'bring-back__s1',
  stepId: 'st-bring-back',
  kind: 'review',
  title: 'Bring these back',
  sourceLabel: 'Brought forward — Chapter 01',
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'bb-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Я вижу свет.',
      meaning: 'I see a light.',
      transliteration: 'Ya vizhu svet.',
      focus: 'Brought back from Chapter 01 — this verse uses it constantly.',
      wordKeys: ['ru:я', 'ru:вижу', 'ru:свет'],
      sourceLineId: 'cl-l1',
      unscored: true,
    },
    {
      id: 'bb-choice-1',
      kind: 'meaning-choice',
      prompt: 'Back without the fanfare — what does свет mean?',
      phrase: 'свет',
      options: [
        { id: 'opt-1', text: 'light' },
        { id: 'opt-2', text: 'sleeps' },
        { id: 'opt-3', text: 'city' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'свет — light, still.',
      wordKey: 'ru:свет',
      unscored: false,
    },
    {
      id: 'bb-recap-1',
      kind: 'recap',
      practised: ['Brought two old expressions back into play'],
      uncertain: 'Review, not a test — misses here just reschedule.',
      unscored: true,
    },
  ],
};

const NEGATION_S1: SessionPlan = {
  id: 'negation__s1',
  stepId: 'st-negation',
  kind: 'step',
  title: 'Hear what changes the meaning',
  sourceLabel: CITY_LIGHTS_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'neg-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Город не спит.',
      meaning: 'The city isn’t sleeping.',
      transliteration: 'Gorod ne spit.',
      focus: 'не sits before the doing word and flips it.',
      wordKeys: ['ru:город', 'ru:не', 'ru:спит'],
      sourceLineId: 'cl-l2',
      unscored: true,
    },
    {
      id: 'neg-choice-1',
      kind: 'meaning-choice',
      prompt: 'What does не do in this line?',
      phrase: 'Город не спит.',
      options: [
        { id: 'opt-1', text: 'Makes it negative — not sleeping' },
        { id: 'opt-2', text: 'Turns it into a question' },
        { id: 'opt-3', text: 'Says who is doing it' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'не + спит = isn’t sleeping. One small word, whole new meaning.',
      wordKey: 'ru:не',
      sourceLineId: 'cl-l2',
      unscored: false,
    },
    {
      id: 'neg-build-1',
      kind: 'phrase-builder',
      prompt: 'The city isn’t sleeping.',
      chips: [
        { id: 'chip-1', text: 'Город', correctPosition: 0 },
        { id: 'chip-2', text: 'не', correctPosition: 1 },
        { id: 'chip-3', text: 'спит', correctPosition: 2 },
        { id: 'chip-4', text: 'вижу', correctPosition: null },
      ],
      answer: ['Город', 'не', 'спит'],
      translation: 'Город не спит.',
      sourceLineId: 'cl-l2',
      wordKeys: ['ru:город', 'ru:не', 'ru:спит'],
      unscored: false,
    },
    {
      id: 'neg-return-1',
      kind: 'passage-return',
      mediaId: 'city-lights',
      passageId: 'cl-verse-1',
      lineIds: ['cl-l2'],
      highlightWordKeys: ['ru:не'],
      note: 'The flip, in place — watch how close не sits to спит.',
      unscored: true,
    },
    {
      id: 'neg-recap-1',
      kind: 'recap',
      practised: ['Checked what не does', 'Built the negative line yourself'],
      unscored: true,
    },
  ],
};

const MOVEMENT_S1: SessionPlan = {
  id: 'movement__s1',
  stepId: 'st-movement',
  kind: 'step',
  title: 'Follow the movement',
  sourceLabel: CITY_LIGHTS_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'mov-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Я иду домой.',
      meaning: 'I’m going home.',
      transliteration: 'Ya idu domoy.',
      focus: 'иду — am going on foot; домой — homeward, a direction not a place.',
      wordKeys: ['ru:иду', 'ru:домой'],
      sourceLineId: 'cl-l3',
      unscored: true,
    },
    {
      id: 'mov-choice-1',
      kind: 'meaning-choice',
      prompt: 'What does домой mean?',
      phrase: 'Я иду домой.',
      options: [
        { id: 'opt-1', text: 'home(ward)' },
        { id: 'opt-2', text: 'north' },
        { id: 'opt-3', text: 'light' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'домой — homeward. The verse ends with the speaker walking home.',
      wordKey: 'ru:домой',
      sourceLineId: 'cl-l3',
      unscored: false,
    },
    {
      id: 'mov-build-1',
      kind: 'phrase-builder',
      prompt: 'I’m going home.',
      chips: [
        { id: 'chip-1', text: 'Я', correctPosition: 0 },
        { id: 'chip-2', text: 'иду', correctPosition: 1 },
        { id: 'chip-3', text: 'домой', correctPosition: 2 },
        { id: 'chip-4', text: 'не', correctPosition: null },
      ],
      answer: ['Я', 'иду', 'домой'],
      translation: 'Я иду домой.',
      sourceLineId: 'cl-l3',
      wordKeys: ['ru:я', 'ru:иду', 'ru:домой'],
      unscored: false,
    },
    {
      id: 'mov-return-1',
      kind: 'passage-return',
      mediaId: 'city-lights',
      passageId: 'cl-verse-1',
      lineIds: ['cl-l3'],
      highlightWordKeys: ['ru:иду', 'ru:домой'],
      note: 'The going, in place — the verse now ends by leaving.',
      unscored: true,
    },
    {
      id: 'mov-recap-1',
      kind: 'recap',
      practised: ['Checked домой’s direction', 'Built the last line yourself'],
      unscored: true,
    },
  ],
};

const RETURN_PASSAGE_S1: SessionPlan = {
  id: 'return-passage__s1',
  stepId: 'st-return-passage',
  kind: 'step',
  title: 'Return to the passage',
  sourceLabel: CITY_LIGHTS_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'rtp-return-1',
      kind: 'passage-return',
      mediaId: 'city-lights',
      passageId: 'cl-verse-1',
      lineIds: ['cl-l1', 'cl-l2', 'cl-l3'],
      highlightWordKeys: ['ru:свет', 'ru:не', 'ru:иду', 'ru:домой'],
      note: 'Read the verse straight through — every piece in it is yours now.',
      unscored: true,
    },
    {
      id: 'rtp-choice-1',
      kind: 'meaning-choice',
      prompt: 'Check your recall — this line means…',
      phrase: 'Город не спит.',
      options: [
        { id: 'opt-1', text: 'The city isn’t sleeping.' },
        { id: 'opt-2', text: 'The city is sleeping.' },
        { id: 'opt-3', text: 'I’m going home.' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'не flips спит — the city is awake.',
      wordKey: 'ru:не',
      sourceLineId: 'cl-l2',
      unscored: false,
    },
    {
      id: 'rtp-choice-2',
      kind: 'meaning-choice',
      prompt: 'And the last line means…',
      phrase: 'Я иду домой.',
      options: [
        { id: 'opt-1', text: 'I’m going home.' },
        { id: 'opt-2', text: 'I see a light.' },
        { id: 'opt-3', text: 'The city isn’t sleeping.' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'иду домой — going home. The verse’s quiet exit.',
      wordKey: 'ru:иду',
      sourceLineId: 'cl-l3',
      unscored: false,
    },
    {
      id: 'rtp-recap-1',
      kind: 'recap',
      practised: ['Reread the whole verse with your own eyes', 'Recalled two lines without help'],
      uncertain: 'This closes the chapter’s main path.',
      unscored: true,
    },
  ],
};

// ── Chapter 03 · Take it beyond the passage ──────────────────────────────

const NEW_STREET_S1: SessionPlan = {
  id: 'new-street__s1',
  stepId: 'st-new-street',
  kind: 'transfer',
  title: 'A new street',
  sourceLabel: METRO_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'nss-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Метро не спит.',
      meaning: 'The metro isn’t sleeping.',
      transliteration: 'Metro ne spit.',
      focus: 'New naming word — метро. The flip you already know.',
      wordKeys: ['ru:метро', 'ru:не', 'ru:спит'],
      sourceLineId: 'lm-l1',
      unscored: true,
    },
    {
      id: 'nss-reveal-2',
      kind: 'phrase-reveal',
      phrase: 'Город светит.',
      meaning: 'The city is giving off light.',
      transliteration: 'Gorod svetit.',
      focus: 'светит is свет doing its work as a doing word.',
      wordKeys: ['ru:город', 'ru:светит'],
      sourceLineId: 'lm-l3',
      unscored: true,
    },
    {
      id: 'nss-reveal-3',
      kind: 'phrase-reveal',
      phrase: 'Я иду домой.',
      meaning: 'I’m going home.',
      transliteration: 'Ya idu domoy.',
      focus: 'An old friend — word for word the verse’s last line.',
      wordKeys: ['ru:я', 'ru:иду', 'ru:домой'],
      sourceLineId: 'lm-l2',
      unscored: true,
    },
    {
      id: 'nss-return-1',
      kind: 'passage-return',
      mediaId: 'last-metro',
      passageId: 'lm-passage',
      lineIds: ['lm-l1', 'lm-l2', 'lm-l3'],
      highlightWordKeys: ['ru:метро', 'ru:светит'],
      note: 'The same city, speaking somewhere else.',
      unscored: true,
    },
    {
      id: 'nss-recap-1',
      kind: 'recap',
      practised: ['Met the night-ride sketch, line by line'],
      unscored: true,
    },
  ],
};

const LIGHT_AGAIN_S1: SessionPlan = {
  id: 'light-again__s1',
  stepId: 'st-light-again',
  kind: 'transfer',
  title: 'Recognize the light again',
  sourceLabel: METRO_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'lag-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'светит',
      meaning: 'gives off light / shines',
      transliteration: 'svyetit',
      focus: 'Same family as свет — the noun you know, turning into a doing word.',
      wordKeys: ['ru:светит'],
      sourceLineId: 'lm-l3',
      unscored: true,
    },
    {
      id: 'lag-choice-1',
      kind: 'meaning-choice',
      prompt: 'You never practised светит — but you know its family. This line means…',
      phrase: 'Город светит.',
      options: [
        { id: 'opt-1', text: 'The city is giving off light.' },
        { id: 'opt-2', text: 'The city isn’t sleeping.' },
        { id: 'opt-3', text: 'I see a light.' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'светит — gives off light, from свет. You read it from the family, not from memory.',
      wordKey: 'ru:светит',
      sourceLineId: 'lm-l3',
      unscored: false,
    },
    {
      id: 'lag-build-1',
      kind: 'phrase-builder',
      prompt: 'The city is giving off light.',
      chips: [
        { id: 'chip-1', text: 'Город', correctPosition: 0 },
        { id: 'chip-2', text: 'светит', correctPosition: 1 },
        { id: 'chip-3', text: 'не', correctPosition: null },
      ],
      answer: ['Город', 'светит'],
      translation: 'Город светит.',
      sourceLineId: 'lm-l3',
      wordKeys: ['ru:город', 'ru:светит'],
      unscored: false,
    },
    {
      id: 'lag-return-1',
      kind: 'passage-return',
      mediaId: 'last-metro',
      passageId: 'lm-passage',
      lineIds: ['lm-l3'],
      highlightWordKeys: ['ru:светит'],
      note: 'The family at work — свет became светит and kept its meaning.',
      unscored: true,
    },
    {
      id: 'lag-recap-1',
      kind: 'recap',
      practised: ['Read a never-practised word from its family'],
      unscored: true,
    },
  ],
};

const HOME_AT_THE_END_S1: SessionPlan = {
  id: 'home-at-the-end__s1',
  stepId: 'st-home-at-the-end',
  kind: 'transfer',
  title: 'Home at the end',
  sourceLabel: METRO_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'hat-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Я иду домой.',
      meaning: 'I’m going home.',
      transliteration: 'Ya idu domoy.',
      focus: 'The verse’s last line — here it is again, word for word.',
      wordKeys: ['ru:я', 'ru:иду', 'ru:домой'],
      sourceLineId: 'lm-l2',
      unscored: true,
    },
    {
      id: 'hat-choice-1',
      kind: 'meaning-choice',
      prompt: 'No hints this time — the line means…',
      phrase: 'Я иду домой.',
      options: [
        { id: 'opt-1', text: 'I’m going home.' },
        { id: 'opt-2', text: 'The metro isn’t sleeping.' },
        { id: 'opt-3', text: 'The city is giving off light.' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'иду домой — going home, cold.',
      wordKey: 'ru:домой',
      sourceLineId: 'lm-l2',
      unscored: false,
    },
    {
      id: 'hat-build-1',
      kind: 'phrase-builder',
      prompt: 'I’m going home.',
      chips: [
        { id: 'chip-1', text: 'Я', correctPosition: 0 },
        { id: 'chip-2', text: 'иду', correctPosition: 1 },
        { id: 'chip-3', text: 'домой', correctPosition: 2 },
        { id: 'chip-4', text: 'Светит', correctPosition: null },
      ],
      answer: ['Я', 'иду', 'домой'],
      translation: 'Я иду домой.',
      sourceLineId: 'lm-l2',
      wordKeys: ['ru:я', 'ru:иду', 'ru:домой'],
      unscored: false,
    },
    {
      id: 'hat-return-1',
      kind: 'passage-return',
      mediaId: 'last-metro',
      passageId: 'lm-passage',
      lineIds: ['lm-l2'],
      highlightWordKeys: ['ru:иду', 'ru:домой'],
      note: 'The ending you own — recognisable on any street.',
      unscored: true,
    },
    {
      id: 'hat-recap-1',
      kind: 'recap',
      practised: ['Understood the line cold, with nothing to lean on'],
      unscored: true,
    },
  ],
};

// ── Chapter 04 · North by night (demo purchase) ──────────────────────────

const NP_MEET_S1: SessionPlan = {
  id: 'np-meet__s1',
  stepId: 'st-np-meet',
  kind: 'step',
  title: 'Meet the passage',
  sourceLabel: NORTHERN_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'npm-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Поезд идёт на север.',
      meaning: 'The train is going north.',
      transliteration: 'Poyezd idyot na sever.',
      focus: 'поезд — a train; идёт — is going (he/she/it).',
      wordKeys: ['ru:поезд', 'ru:идёт', 'ru:на', 'ru:север'],
      sourceLineId: 'np-l1',
      unscored: true,
    },
    {
      id: 'npm-reveal-2',
      kind: 'phrase-reveal',
      phrase: 'Я жду на платформе.',
      meaning: 'I’m waiting on the platform.',
      transliteration: 'Ya zhdu na platforme.',
      focus: 'жду — (I) wait, the -у ending again; на — on / at.',
      wordKeys: ['ru:я', 'ru:жду', 'ru:на', 'ru:платформе'],
      sourceLineId: 'np-l2',
      unscored: true,
    },
    {
      id: 'npm-return-1',
      kind: 'passage-return',
      mediaId: 'northern-platform',
      passageId: 'np-verse-1',
      lineIds: ['np-l1', 'np-l2'],
      highlightWordKeys: ['ru:поезд', 'ru:идёт', 'ru:жду'],
      note: 'Two lines, one platform — read them once, supported.',
      unscored: true,
    },
    {
      id: 'npm-recap-1',
      kind: 'recap',
      practised: ['Met both lines of the platform verse'],
      unscored: true,
    },
  ],
};

const NP_TRAIN_S1: SessionPlan = {
  id: 'np-train__s1',
  stepId: 'st-np-train',
  kind: 'step',
  title: 'The train goes',
  sourceLabel: NORTHERN_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'npt-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'идёт',
      meaning: '(it) is going',
      transliteration: 'idyot',
      focus: 'Same family as иду — the ending changes who is going: he/she/it.',
      wordKeys: ['ru:идёт'],
      sourceLineId: 'np-l1',
      unscored: true,
    },
    {
      id: 'npt-choice-1',
      kind: 'meaning-choice',
      prompt: 'The family is doing its work — this line means…',
      phrase: 'Поезд идёт на север.',
      options: [
        { id: 'opt-1', text: 'The train is going north.' },
        { id: 'opt-2', text: 'I’m waiting on the platform.' },
        { id: 'opt-3', text: 'The city isn’t sleeping.' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'идёт — is going, from the иду family. Поезд — the train; север — north.',
      wordKey: 'ru:идёт',
      sourceLineId: 'np-l1',
      unscored: false,
    },
    {
      id: 'npt-build-1',
      kind: 'phrase-builder',
      prompt: 'The train is going north.',
      chips: [
        { id: 'chip-1', text: 'Поезд', correctPosition: 0 },
        { id: 'chip-2', text: 'идёт', correctPosition: 1 },
        { id: 'chip-3', text: 'на', correctPosition: 2 },
        { id: 'chip-4', text: 'север', correctPosition: 3 },
        { id: 'chip-5', text: 'домой', correctPosition: null },
      ],
      answer: ['Поезд', 'идёт', 'на', 'север'],
      translation: 'Поезд идёт на север.',
      sourceLineId: 'np-l1',
      wordKeys: ['ru:поезд', 'ru:идёт', 'ru:на', 'ru:север'],
      unscored: false,
    },
    {
      id: 'npt-return-1',
      kind: 'passage-return',
      mediaId: 'northern-platform',
      passageId: 'np-verse-1',
      lineIds: ['np-l1'],
      highlightWordKeys: ['ru:идёт'],
      note: 'идёт, in place — the going-word with a new ending.',
      unscored: true,
    },
    {
      id: 'npt-recap-1',
      kind: 'recap',
      practised: ['Read идёт from the иду family', 'Built the train line yourself'],
      unscored: true,
    },
  ],
};

const NP_WAITING_S1: SessionPlan = {
  id: 'np-waiting__s1',
  stepId: 'st-np-waiting',
  kind: 'step',
  title: 'Waiting on the platform',
  sourceLabel: NORTHERN_SOURCE,
  sequenceIndex: 1,
  sessionCount: 1,
  activities: [
    {
      id: 'npw-reveal-1',
      kind: 'phrase-reveal',
      phrase: 'Я жду на платформе.',
      meaning: 'I’m waiting on the platform.',
      transliteration: 'Ya zhdu na platforme.',
      focus: 'жду — the -у ending again: I am the one waiting.',
      wordKeys: ['ru:жду', 'ru:платформе'],
      sourceLineId: 'np-l2',
      unscored: true,
    },
    {
      id: 'npw-choice-1',
      kind: 'meaning-choice',
      prompt: 'What does жду mean?',
      phrase: 'Я жду на платформе.',
      options: [
        { id: 'opt-1', text: '(I) wait / am waiting' },
        { id: 'opt-2', text: '(I) am going' },
        { id: 'opt-3', text: 'sleeps' },
      ],
      correctOptionId: 'opt-1',
      explanation: 'жду — (I) wait. Same -у signature as вижу and иду.',
      wordKey: 'ru:жду',
      sourceLineId: 'np-l2',
      unscored: false,
    },
    {
      id: 'npw-build-1',
      kind: 'phrase-builder',
      prompt: 'I’m waiting on the platform.',
      chips: [
        { id: 'chip-1', text: 'Я', correctPosition: 0 },
        { id: 'chip-2', text: 'жду', correctPosition: 1 },
        { id: 'chip-3', text: 'на', correctPosition: 2 },
        { id: 'chip-4', text: 'платформе', correctPosition: 3 },
        { id: 'chip-5', text: 'Идёт', correctPosition: null },
      ],
      answer: ['Я', 'жду', 'на', 'платформе'],
      translation: 'Я жду на платформе.',
      sourceLineId: 'np-l2',
      wordKeys: ['ru:я', 'ru:жду', 'ru:на', 'ru:платформе'],
      unscored: false,
    },
    {
      id: 'npw-return-1',
      kind: 'passage-return',
      mediaId: 'northern-platform',
      passageId: 'np-verse-1',
      lineIds: ['np-l1', 'np-l2'],
      highlightWordKeys: ['ru:жду', 'ru:идёт'],
      note: 'Both lines together — one waits, one goes.',
      unscored: true,
    },
    {
      id: 'npw-recap-1',
      kind: 'recap',
      practised: ['Checked жду inside its line', 'Built the waiting line yourself'],
      unscored: true,
    },
  ],
};

// ── Registry ─────────────────────────────────────────────────────────────

export const SESSION_PLANS: Record<string, SessionPlan> = {
  'meet-key-words__s1': MEET_KEY_WORDS_S1,
  'find-who-speaks__s1': FIND_WHO_SPEAKS_S1,
  'build-phrase__s1': BUILD_PHRASE_S1,
  'recall-fewer-hints__s1': RECALL_FEWER_HINTS_S1,
  'new-setting__s1': NEW_SETTING_S1,
  'meet-passage__s1': MEET_PASSAGE_S1,
  'find-the-light__s1': FIND_THE_LIGHT_S1,
  'find-the-light__s2': FIND_THE_LIGHT_S2,
  'bring-back__s1': BRING_BACK_S1,
  'negation__s1': NEGATION_S1,
  'movement__s1': MOVEMENT_S1,
  'return-passage__s1': RETURN_PASSAGE_S1,
  'new-street__s1': NEW_STREET_S1,
  'light-again__s1': LIGHT_AGAIN_S1,
  'home-at-the-end__s1': HOME_AT_THE_END_S1,
  'np-meet__s1': NP_MEET_S1,
  'np-train__s1': NP_TRAIN_S1,
  'np-waiting__s1': NP_WAITING_S1,
};

export function getSessionPlan(planId: string): SessionPlan | null {
  return SESSION_PLANS[planId] ?? null;
}

/**
 * Resolve any session id the player can be opened with: a registered plan,
 * or a bounded-review plan rebuilt from its content-derived id (the id
 * carries exactly the word keys, so the rebuild is deterministic and an
 * exit/resume of the same review re-pins cleanly).
 */
export function resolveSessionPlan(sessionId: string): SessionPlan | null {
  const registered = getSessionPlan(sessionId);
  if (registered) return registered;
  const PREFIX = 'review-bounded__';
  if (!sessionId.startsWith(PREFIX)) return null;
  const keys = sessionId.slice(PREFIX.length).split('+');
  return buildBoundedReviewPlan(keys);
}

// ── Bounded notebook review ──────────────────────────────────────────────
// "Review 5 now" (brief §5.6): an ad-hoc session over at most five due
// words, built deterministically from the passage data. The plan id is
// content-derived so an exit/resume of the same review re-pins cleanly.

const REVIEW_WORD_ORDER = [
  'ru:свет',
  'ru:вижу',
  'ru:я',
  'ru:не',
  'ru:спит',
  'ru:иду',
  'ru:домой',
  'ru:город',
  'ru:метро',
  'ru:светит',
  'ru:поезд',
  'ru:идёт',
  'ru:жду',
  'ru:на',
  'ru:платформе',
  'ru:север',
];

export const REVIEW_SESSION_CAP = 5;

/** Two distractor meanings for a review choice: the next distinct words in
 *  the fixed order, wrapping — deterministic for any due-set. */
function reviewDistractors(wordKey: string): string[] {
  const index = REVIEW_WORD_ORDER.indexOf(wordKey);
  const picks: string[] = [];
  for (let step = 1; step <= REVIEW_WORD_ORDER.length && picks.length < 2; step++) {
    const candidate = REVIEW_WORD_ORDER[(index + step) % REVIEW_WORD_ORDER.length];
    if (candidate && candidate !== wordKey && !picks.includes(candidate)) {
      picks.push(candidate);
    }
  }
  return picks;
}

export function buildBoundedReviewPlan(dueKeys: string[]): SessionPlan | null {
  const keys = dueKeys
    .filter((key, i) => dueKeys.indexOf(key) === i && REVIEW_WORD_ORDER.includes(key))
    .slice(0, REVIEW_SESSION_CAP);
  if (keys.length === 0) return null;

  const activities: SessionPlan['activities'] = keys.map((wordKey, i) => {
    // Rotate the correct answer's slot so it isn't always first.
    const correctSlot = i % 3;
    const texts: string[] = [];
    for (let slot = 0; slot < 3; slot++) {
      texts.push(slot === correctSlot ? MEANINGS[wordKey] ?? wordKey : '');
    }
    // Fill the remaining slots with deterministic distractor meanings.
    const distractors = reviewDistractors(wordKey);
    let pick = 0;
    for (let slot = 0; slot < 3; slot++) {
      if (texts[slot] === '') {
        texts[slot] = MEANINGS[distractors[pick]] ?? distractors[pick];
        pick++;
      }
    }
    return {
      id: `rv-${i}-choice`,
      kind: 'meaning-choice' as const,
      prompt: 'Back from your notebook — what does this mean?',
      phrase: wordKey.replace(/^ru:/, ''),
      options: texts.map((text, j) => ({ id: `opt-${j + 1}`, text })),
      correctOptionId: `opt-${correctSlot + 1}`,
      explanation: `«${wordKey.replace(/^ru:/, '')}» — ${MEANINGS[wordKey] ?? wordKey}.`,
      wordKey,
      unscored: false,
    };
  });

  return {
    id: `review-bounded__${keys.join('+')}`,
    stepId: null,
    kind: 'review',
    title: 'Review 5 now',
    sourceLabel: 'From your notebook',
    sequenceIndex: 1,
    sessionCount: 1,
    activities: [
      ...activities,
      {
        id: 'rv-recap',
        kind: 'recap',
        practised: ['Reviewed what was drifting'],
        uncertain: 'Whatever you missed comes back sooner — that’s the whole rule.',
        unscored: true,
      },
    ],
  };
}

// Meanings for review choices, mirrored from the passage data (kept here so
// the review builder stays independent of any single media item).
const MEANINGS: Record<string, string> = {
  'ru:свет': 'light',
  'ru:вижу': '(I) see',
  'ru:я': 'I',
  'ru:не': 'not',
  'ru:спит': 'sleeps',
  'ru:иду': '(I) am going (on foot)',
  'ru:домой': 'home(ward)',
  'ru:город': 'city',
  'ru:метро': 'metro / underground',
  'ru:светит': 'gives off light / shines',
  'ru:поезд': 'train',
  'ru:идёт': '(it) is going',
  'ru:жду': '(I) wait / am waiting',
  'ru:на': 'on / to',
  'ru:платформе': 'platform (on/at the)',
  'ru:север': 'north',
};
