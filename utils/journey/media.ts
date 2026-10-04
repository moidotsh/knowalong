// utils/journey/media.ts
//
// Original sample media for the prototype journey. Everything here is
// ORIGINAL practice text written for this prototype — no real artist's
// lyrics, no commercial recordings, no invented-as-real claims. The
// reader surfaces label each item with its honest originLabel.
//
// "City lights" carries three short illustrative Russian lines with
// straightforward English translations. Word data is aligned to
// whitespace tokens (punctuation trimmed at render time) and every
// analysis-backed line carries its words; lines without full support
// simply omit words (the reader degrades honestly).

import type { MediaItem, PassageLine, PassageWord } from './types';

// ── Word helpers ─────────────────────────────────────────────────────────

function word(form: string, data: Omit<PassageWord, 'form'>): PassageWord {
  return { form, ...data };
}

// ── City lights — the original practice song ─────────────────────────────

const CITY_LIGHTS_VERSE_LINES: PassageLine[] = [
  {
    id: 'cl-l1',
    ordinal: 1,
    text: 'Я вижу свет.',
    translation: 'I see a light.',
    transliteration: 'Ya vizhu svet.',
    words: [
      word('Я', {
        lemma: 'я',
        wordKey: 'ru:я',
        meaning: 'I',
        roleLabel: 'a naming word for yourself',
        transliteration: 'ya',
      }),
      word('вижу', {
        lemma: 'видеть',
        wordKey: 'ru:вижу',
        meaning: '(I) see',
        roleLabel: 'a doing word',
        transliteration: 'vizhu',
        patternNote: 'The -у ending says "I" am doing it.',
      }),
      word('свет', {
        lemma: 'свет',
        wordKey: 'ru:свет',
        meaning: 'light',
        roleLabel: 'a naming word',
        transliteration: 'svet',
      }),
    ],
  },
  {
    id: 'cl-l2',
    ordinal: 2,
    text: 'Город не спит.',
    translation: 'The city isn’t sleeping.',
    transliteration: 'Gorod ne spit.',
    words: [
      word('Город', {
        lemma: 'город',
        wordKey: 'ru:город',
        meaning: 'city',
        roleLabel: 'a naming word',
        transliteration: 'gorod',
      }),
      word('не', {
        lemma: 'не',
        wordKey: 'ru:не',
        meaning: 'not',
        roleLabel: 'the flip',
        transliteration: 'nye',
        patternNote: 'не before a doing word makes it negative — "doesn’t".',
      }),
      word('спит', {
        lemma: 'спать',
        wordKey: 'ru:спит',
        meaning: 'sleeps',
        roleLabel: 'a doing word',
        transliteration: 'spit',
      }),
    ],
  },
  {
    id: 'cl-l3',
    ordinal: 3,
    text: 'Я иду домой.',
    translation: 'I’m going home.',
    transliteration: 'Ya idu domoy.',
    words: [
      word('Я', {
        lemma: 'я',
        wordKey: 'ru:я',
        meaning: 'I',
        roleLabel: 'a naming word for yourself',
        transliteration: 'ya',
      }),
      word('иду', {
        lemma: 'идти',
        wordKey: 'ru:иду',
        meaning: '(I) am going (on foot)',
        roleLabel: 'a doing word',
        transliteration: 'idu',
        familyOf: 'ru:иду',
        patternNote: 'иду and иду́т share a family — "go" with different who.',
      }),
      word('домой', {
        lemma: 'домой',
        wordKey: 'ru:домой',
        meaning: 'home(ward)',
        roleLabel: 'a where-word',
        transliteration: 'domoy',
      }),
    ],
  },
];

const CITY_LIGHTS: MediaItem = {
  id: 'city-lights',
  kind: 'song',
  title: 'City lights',
  subtitle: null,
  language: 'ru',
  originLabel: 'Original practice text',
  artwork: 'dusk',
  access: 'free',
  passages: [
    {
      id: 'cl-verse-1',
      label: 'Verse 1',
      kind: 'verse',
      lines: CITY_LIGHTS_VERSE_LINES,
    },
  ],
};

// ── Northern platform — the purchasable original song placeholder ────────

const NORTHERN_PLATFORM_LINES: PassageLine[] = [
  {
    id: 'np-l1',
    ordinal: 1,
    text: 'Поезд идёт на север.',
    translation: 'The train is going north.',
    transliteration: 'Poyezd idyot na sever.',
    words: [
      word('Поезд', {
        lemma: 'поезд',
        wordKey: 'ru:поезд',
        meaning: 'train',
        roleLabel: 'a naming word',
        transliteration: 'poyezd',
      }),
      word('идёт', {
        lemma: 'идти',
        wordKey: 'ru:идёт',
        meaning: '(it) is going',
        roleLabel: 'a doing word',
        transliteration: 'idyot',
        patternNote: 'Same family as иду — "go". The ending says who: he/she/it.',
      }),
      word('на', {
        lemma: 'на',
        wordKey: 'ru:на',
        meaning: 'on / to',
        roleLabel: 'a small joiner',
        transliteration: 'na',
      }),
      word('север', {
        lemma: 'север',
        wordKey: 'ru:север',
        meaning: 'north',
        roleLabel: 'a naming word',
        transliteration: 'sever',
      }),
    ],
  },
  {
    id: 'np-l2',
    ordinal: 2,
    text: 'Я жду на платформе.',
    translation: 'I’m waiting on the platform.',
    transliteration: 'Ya zhdu na platforme.',
    words: [
      word('Я', {
        lemma: 'я',
        wordKey: 'ru:я',
        meaning: 'I',
        roleLabel: 'a naming word for yourself',
        transliteration: 'ya',
      }),
      word('жду', {
        lemma: 'ждать',
        wordKey: 'ru:жду',
        meaning: '(I) wait / am waiting',
        roleLabel: 'a doing word',
        transliteration: 'zhdu',
        patternNote: 'The -у ending again: "I" am doing it.',
      }),
      word('на', {
        lemma: 'на',
        wordKey: 'ru:на',
        meaning: 'on / at',
        roleLabel: 'a small joiner',
        transliteration: 'na',
      }),
      word('платформе', {
        lemma: 'платформа',
        wordKey: 'ru:платформе',
        meaning: 'platform (on/at the)',
        roleLabel: 'a naming word',
        transliteration: 'platformye',
      }),
    ],
  },
];

const NORTHERN_PLATFORM: MediaItem = {
  id: 'northern-platform',
  kind: 'song',
  title: 'Northern platform',
  subtitle: null,
  language: 'ru',
  originLabel: 'Original practice text',
  artwork: 'north',
  access: 'purchasable',
  priceUsd: 2.99,
  included: [
    'Both verse passages, fully supported',
    'A short learning chapter built from the words',
    'Study offline once prepared',
    'These words keep returning in review',
  ],
  passages: [
    {
      id: 'np-verse-1',
      label: 'Verse 1',
      kind: 'verse',
      lines: NORTHERN_PLATFORM_LINES,
    },
  ],
};

// ── Last metro home — the original short prose item ──────────────────────
// Deliberately reuses the City lights word families (свет, иду домой,
// не спит) so the transfer chapter is honest practice, plus one new
// word per line at most.

const LAST_METRO_LINES: PassageLine[] = [
  {
    id: 'lm-l1',
    ordinal: 1,
    text: 'Метро не спит.',
    translation: 'The metro isn’t sleeping.',
    transliteration: 'Metro ne spit.',
    words: [
      word('Метро', {
        lemma: 'метро',
        wordKey: 'ru:метро',
        meaning: 'metro / underground',
        roleLabel: 'a naming word',
        transliteration: 'myetro',
      }),
      word('не', {
        lemma: 'не',
        wordKey: 'ru:не',
        meaning: 'not',
        roleLabel: 'the flip',
        transliteration: 'nye',
        patternNote: 'не before a doing word makes it negative — "doesn’t".',
      }),
      word('спит', {
        lemma: 'спать',
        wordKey: 'ru:спит',
        meaning: 'sleeps',
        roleLabel: 'a doing word',
        transliteration: 'spit',
      }),
    ],
  },
  {
    id: 'lm-l2',
    ordinal: 2,
    text: 'Я иду домой.',
    translation: 'I’m going home.',
    transliteration: 'Ya idu domoy.',
    words: [
      word('Я', {
        lemma: 'я',
        wordKey: 'ru:я',
        meaning: 'I',
        roleLabel: 'a naming word for yourself',
        transliteration: 'ya',
      }),
      word('иду', {
        lemma: 'идти',
        wordKey: 'ru:иду',
        meaning: '(I) am going (on foot)',
        roleLabel: 'a doing word',
        transliteration: 'idu',
      }),
      word('домой', {
        lemma: 'домой',
        wordKey: 'ru:домой',
        meaning: 'home(ward)',
        roleLabel: 'a where-word',
        transliteration: 'domoy',
      }),
    ],
  },
  {
    id: 'lm-l3',
    ordinal: 3,
    text: 'Город светит.',
    translation: 'The city is giving off light.',
    transliteration: 'Gorod svetit.',
    words: [
      word('Город', {
        lemma: 'город',
        wordKey: 'ru:город',
        meaning: 'city',
        roleLabel: 'a naming word',
        transliteration: 'gorod',
      }),
      word('светит', {
        lemma: 'светить',
        wordKey: 'ru:светит',
        meaning: 'gives off light / shines',
        roleLabel: 'a doing word',
        transliteration: 'svyetit',
        familyOf: 'ru:свет',
        patternNote: 'Same family as свет (light) — светит is "gives light".',
      }),
    ],
  },
];

const LAST_METRO: MediaItem = {
  id: 'last-metro',
  kind: 'prose',
  title: 'Last metro home',
  subtitle: null,
  language: 'ru',
  originLabel: 'Original practice text',
  artwork: 'metro',
  access: 'free',
  passages: [
    {
      id: 'lm-passage',
      label: 'A short prose sketch',
      kind: 'prose',
      lines: LAST_METRO_LINES,
    },
  ],
};

// ── Registry ─────────────────────────────────────────────────────────────

export const MEDIA_ITEMS: Record<string, MediaItem> = {
  'city-lights': CITY_LIGHTS,
  'northern-platform': NORTHERN_PLATFORM,
  'last-metro': LAST_METRO,
};

export const MEDIA_ORDER = ['city-lights', 'last-metro', 'northern-platform'];

export function getMediaItem(mediaId: string): MediaItem | null {
  return MEDIA_ITEMS[mediaId] ?? null;
}

/** The canonical media a wordKey is evidenced from (first appearance in
 *  collection order). Every evidence record sources its media honestly
 *  through this — no invented sources for words the passages don't have. */
export function canonicalMediaForWord(wordKey: string): string | null {
  for (const mediaId of MEDIA_ORDER) {
    const media = MEDIA_ITEMS[mediaId];
    if (!media) continue;
    for (const passage of media.passages) {
      for (const line of passage.lines) {
        if (line.words.some((w) => w.wordKey === wordKey)) return mediaId;
      }
    }
  }
  return null;
}

/** The passage word data for a key (form, meaning, role, notes) — first
 *  occurrence wins. Null for keys outside the prepared passages. */
export function getPassageWord(wordKey: string): PassageWord | null {
  for (const mediaId of MEDIA_ORDER) {
    const media = MEDIA_ITEMS[mediaId];
    if (!media) continue;
    for (const passage of media.passages) {
      for (const line of passage.lines) {
        const hit = line.words.find((w) => w.wordKey === wordKey);
        if (hit) return hit;
      }
    }
  }
  return null;
}

/** A trimmed-text → lineId index across all prepared passages — the
 *  import flow's honesty check for "we can prepare this". */
export function knownLineIndex(): Record<string, { lineId: string; mediaId: string; passageId: string }> {
  const index: Record<string, { lineId: string; mediaId: string; passageId: string }> = {};
  for (const mediaId of MEDIA_ORDER) {
    const media = MEDIA_ITEMS[mediaId];
    if (!media) continue;
    for (const passage of media.passages) {
      for (const line of passage.lines) {
        const key = line.text.trim();
        if (key && !index[key]) index[key] = { lineId: line.id, mediaId, passageId: passage.id };
      }
    }
  }
  return index;
}

/** All word occurrences across a media item's passages, keyed by wordKey
 *  (first occurrence wins). Powers the Notebook's source links. */
export function mediaWordIndex(media: MediaItem): Record<string, { word: PassageWord; lineId: string; passageId: string }> {
  const index: Record<string, { word: PassageWord; lineId: string; passageId: string }> = {};
  for (const passage of media.passages) {
    for (const line of passage.lines) {
      for (const w of line.words) {
        if (!index[w.wordKey]) {
          index[w.wordKey] = { word: w, lineId: line.id, passageId: passage.id };
        }
      }
    }
  }
  return index;
}

/** The sample import text — pasting this back into the add flow is the
 *  "successful sample import" path (the only fully simulated lesson route). */
export const SAMPLE_IMPORT_TEXT = [
  'Я вижу свет.',
  'Город не спит.',
  'Я иду домой.',
].join('\n');
