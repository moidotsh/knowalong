// __tests__/knowalong/songModel.test.ts
//
// Part A §1.1 — the canonical song model. Pins the demo adapter (the playable
// fixture song projected honestly), the library adapter (repository sources
// that must never invent translations, glosses or practice availability —
// §1.5), and the shelf selectors (song-word joins, the due set, next passage).

import { describe, it, expect } from 'vitest';
import {
  DEMO_SONG_ID,
  demoSongToCanonical,
  demoPracticeProgress,
  demoSubDeckIdForSection,
} from '../../utils/knowalong/song/demoSongAdapter';
import { librarySongToCanonical } from '../../utils/knowalong/song/librarySongAdapter';
import {
  selectSongWords,
  selectKnownWords,
  selectDueWords,
  nextDemoPassage,
  selectDeferredTargets,
  demoSubDeckForSection,
  demoSectionIdForSubDeck,
} from '../../utils/knowalong/song/selectors';
import type { CanonicalSong, CanonicalWord } from '../../utils/knowalong/song/types';
import { SVETOFOR_SONG } from '../../utils/knowalong/fixtures/svetoforSong';
import { WORD_FADE_THRESHOLD, wordKey, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';
import type { LearningSource, SourceLine, SourceSection } from '../../shared/types/knowalong';

const T = WORD_FADE_THRESHOLD;
const graduated: WordMastery = { exposures: 1, correct: T, streak: T, mistakes: 0, lastSeenMs: 1 };

// ── Repository entity fixtures (LearningSource / SourceSection / SourceLine) ─

const TS = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

function makeSource(over: Partial<LearningSource> = {}): LearningSource {
  return {
    id: 'src-1',
    userId: 'user-1',
    sourceType: 'lyrics',
    title: 'Тестовая песня',
    artist: 'Артист',
    targetLanguage: 'ru',
    translationLanguage: 'en',
    notes: null,
    sourceContentHash: null,
    processingStatus: 'draft',
    ...TS,
    ...over,
  };
}

function makeSection(over: Partial<SourceSection> = {}): SourceSection {
  return {
    id: 'sec-1',
    sourceId: 'src-1',
    ordinal: 1,
    sectionType: 'verse',
    label: 'Verse 1',
    ...TS,
    ...over,
  };
}

function makeLine(over: Partial<SourceLine> = {}): SourceLine {
  return {
    id: 'line-1',
    sourceId: 'src-1',
    sectionId: 'sec-1',
    ordinal: 1,
    rawText: 'ночь улица фонарь аптека',
    normalizedText: null,
    translation: null,
    transliteration: null,
    reviewStatus: 'new',
    ...TS,
    ...over,
  };
}

/** Minimal canonical song carrying one line of the given analyzed words. */
function songWith(id: string, words: CanonicalWord[]): CanonicalSong {
  return {
    id,
    title: id,
    artist: null,
    targetLanguage: 'ru',
    origin: 'demo',
    prep: 'ready',
    statusNote: null,
    sections: [
      {
        id: `${id}-s1`,
        ordinal: 1,
        label: 'Section 1',
        kind: 'verse',
        practice: 'supported',
        lines: [{ ordinal: 1, text: 'x', translation: 'x', words, difficulty: null }],
      },
    ],
    practice: { supportedSections: 1, totalSections: 1, translatedLines: 1, totalLines: 1 },
    analysisSourceId: null,
  };
}

// ── Demo adapter ─────────────────────────────────────────────────────────────

describe('demoSongToCanonical', () => {
  const song = demoSongToCanonical();
  const totalFixtureLines = SVETOFOR_SONG.sections.reduce((n, s) => n + s.lines.length, 0);

  it('projects the fixture song honestly — everything playable, nothing invented', () => {
    expect(song.id).toBe(DEMO_SONG_ID);
    expect(song.id).toBe('svetofor');
    expect(song.title).toBe('Светофор');
    expect(song.artist).toBe('Mnogoznaal');
    expect(song.targetLanguage).toBe('ru');
    expect(song.origin).toBe('demo');
    expect(song.prep).toBe('ready');
    expect(song.analysisSourceId).toBeNull();
  });

  it('every section maps 1:1 with the fixture and is practice-supported', () => {
    expect(song.sections.length).toBe(SVETOFOR_SONG.sections.length);
    for (const [i, section] of song.sections.entries()) {
      expect(section.id).toBe(SVETOFOR_SONG.sections[i].id);
      expect(section.label).toBe(SVETOFOR_SONG.sections[i].label);
      expect(section.ordinal).toBe(i + 1);
      expect(section.practice).toBe('supported');
      expect(section.lines.length).toBe(SVETOFOR_SONG.sections[i].lines.length);
    }
    expect(song.practice).toEqual({
      supportedSections: song.sections.length,
      totalSections: song.sections.length,
      translatedLines: totalFixtureLines,
      totalLines: totalFixtureLines,
    });
  });

  it('lines carry the analyzed fixture text + glosses (no nulls where analysis exists)', () => {
    const firstLine = song.sections[0].lines[0];
    const fixtureLine = SVETOFOR_SONG.sections[0].lines[0];
    expect(firstLine.text).toBe(fixtureLine.text);
    expect(firstLine.translation).toBe(fixtureLine.translation);
    expect(firstLine.words?.map((w) => w.form)).toEqual(fixtureLine.words.map((w) => w.form));
    for (const w of firstLine.words ?? []) expect(w.gloss).not.toBeNull();
  });
});

describe('demoPracticeProgress', () => {
  it('empty mastery → zero practised lines', () => {
    expect(demoPracticeProgress({}).practisedLines).toBe(0);
  });

  it('streak just below the threshold is NOT practised (the fade rule decides, not eyeballing)', () => {
    const almost: MasteryMap = {};
    for (const section of SVETOFOR_SONG.sections) {
      for (const line of section.lines) {
        for (const w of line.words) almost[wordKey(w.form)] = { exposures: 1, correct: T - 1, streak: T - 1, mistakes: 0, lastSeenMs: 1 };
      }
    }
    expect(demoPracticeProgress(almost).practisedLines).toBe(0);
  });

  it('every word graduated → every line practised', () => {
    const all: MasteryMap = {};
    for (const section of SVETOFOR_SONG.sections) {
      for (const line of section.lines) {
        for (const w of line.words) all[wordKey(w.form)] = graduated;
      }
    }
    const total = SVETOFOR_SONG.sections.reduce((n, s) => n + s.lines.length, 0);
    expect(demoPracticeProgress(all).practisedLines).toBe(total);
  });
});

describe('section↔sub-deck id helpers', () => {
  it('round-trips the demo song ids', () => {
    expect(demoSubDeckIdForSection('intro')).toBe('sv-intro');
    expect(demoSectionIdForSubDeck('sv-intro')).toBe('intro');
    expect(demoSectionIdForSubDeck('sv-chorus')).toBe('chorus');
  });

  it('verified lookup for known sections; null only for unknown sub-decks', () => {
    expect(demoSubDeckForSection('chorus')).toBe('sv-chorus');
    expect(demoSubDeckForSection('not-a-section')).toBe('sv-not-a-section'); // legacy `sv-` join
    expect(demoSectionIdForSubDeck('not-a-subdeck')).toBeNull();
  });
});

// ── Library adapter ──────────────────────────────────────────────────────────

describe('librarySongToCanonical — honest status mapping', () => {
  it('draft → preparing with a saved-not-analyzed note; text-only section is unavailable', () => {
    const song = librarySongToCanonical(
      makeSource({ processingStatus: 'draft' }),
      [makeSection()],
      [makeLine(), makeLine({ id: 'line-2', ordinal: 2, rawText: 'бессонница' })],
    );
    expect(song.prep).toBe('preparing');
    expect(song.statusNote).toBe('Saved — analysis not started yet');
    expect(song.origin).toBe('library');
    expect(song.analysisSourceId).toBe('src-1');
    expect(song.sections[0].practice).toBe('unavailable');
    expect(song.sections[0].lines[0]).toMatchObject({
      text: 'ночь улица фонарь аптека',
      translation: null,
      words: null,
    });
    expect(song.practice).toEqual({ supportedSections: 0, totalSections: 1, translatedLines: 0, totalLines: 2 });
  });

  it('analyzed + full translation coverage → ready (practice still pending, sections explorable)', () => {
    const song = librarySongToCanonical(
      makeSource({ processingStatus: 'analyzed' }),
      [makeSection()],
      [
        makeLine({ rawText: 'ночь, улица.', translation: 'night, street.' }),
        makeLine({ id: 'line-2', ordinal: 2, rawText: 'фонарь аптека', translation: 'lamp pharmacy' }),
      ],
    );
    expect(song.prep).toBe('ready');
    expect(song.statusNote).toBe('Readable — practice preparation pending');
    expect(song.sections[0].practice).toBe('explore-only');
    expect(song.practice.supportedSections).toBe(0);
    expect(song.practice.translatedLines).toBe(2);
    // Tokenized surface words only — no glosses are fabricated (§1.5).
    expect(song.sections[0].lines[0].words?.map((w) => w.form)).toEqual(['ночь', 'улица']);
    for (const w of song.sections[0].lines[0].words ?? []) {
      expect(w.gloss).toBeNull();
      expect(w.role).toBeNull();
    }
  });

  it('analyzed with partial coverage stays partial; untranslated lines stay text-only', () => {
    const song = librarySongToCanonical(
      makeSource({ processingStatus: 'analyzed' }),
      [makeSection()],
      [makeLine({ translation: 'night, street' }), makeLine({ id: 'line-2', ordinal: 2 })],
    );
    expect(song.prep).toBe('partial');
    expect(song.statusNote).toBeNull();
    expect(song.sections[0].practice).toBe('explore-only');
    expect(song.sections[0].lines[1].words).toBeNull();
    expect(song.practice.translatedLines).toBe(1);
  });

  it('analysis_failed → preparing with the retry note (honest failure, §1.5)', () => {
    const song = librarySongToCanonical(makeSource({ processingStatus: 'analysis_failed' }), [makeSection()], [makeLine()]);
    expect(song.prep).toBe('preparing');
    expect(song.statusNote).toBe('Analysis failed — you can retry it');
  });

  it('analyzing → preparing with the in-progress note', () => {
    const song = librarySongToCanonical(makeSource({ processingStatus: 'analyzing' }), [makeSection()], [makeLine()]);
    expect(song.prep).toBe('preparing');
    expect(song.statusNote).toBe('Analysis in progress…');
  });

  it('archived → archived', () => {
    const song = librarySongToCanonical(makeSource({ processingStatus: 'archived' }), [makeSection()], [makeLine()]);
    expect(song.prep).toBe('archived');
    expect(song.statusNote).toBeNull();
  });
});

describe('librarySongToCanonical — structure', () => {
  it('unsectioned lines become a trailing provisional "Lines" section', () => {
    const song = librarySongToCanonical(
      makeSource({ processingStatus: 'draft' }),
      [],
      [makeLine({ sectionId: null, rawText: 'черновой куплет' })],
    );
    expect(song.sections.length).toBe(1);
    const provisional = song.sections[0];
    expect(provisional.id).toBe('src-1:unsectioned');
    expect(provisional.label).toBe('Lines');
    expect(provisional.kind).toBe('section');
    expect(provisional.lines[0].text).toBe('черновой куплет');
  });

  it('sorts sections and lines by repository ordinal, renumbering canonically 1..N', () => {
    const song = librarySongToCanonical(
      makeSource({ processingStatus: 'draft' }),
      [
        makeSection({ id: 'sec-2', ordinal: 2, sectionType: 'chorus', label: 'Chorus' }),
        makeSection({ id: 'sec-1', ordinal: 1, sectionType: 'verse', label: 'Verse 1' }),
      ],
      [
        makeLine({ id: 'line-2', ordinal: 2, rawText: 'вторая строка' }),
        makeLine({ id: 'line-1', ordinal: 1, rawText: 'первая строка' }),
      ],
    );
    expect(song.sections.map((s) => s.id)).toEqual(['sec-1', 'sec-2']);
    expect(song.sections.map((s) => s.ordinal)).toEqual([1, 2]);
    expect(song.sections[0].lines.map((l) => l.text)).toEqual(['первая строка', 'вторая строка']);
    expect(song.sections[0].lines.map((l) => l.ordinal)).toEqual([1, 2]);
    expect(song.sections[0].kind).toBe('verse');
    expect(song.sections[1].kind).toBe('chorus');
  });

  it('maps stanza/section types to the canonical "section" kind', () => {
    const song = librarySongToCanonical(
      makeSource({ processingStatus: 'draft' }),
      [makeSection({ sectionType: 'stanza' })],
      [makeLine()],
    );
    expect(song.sections[0].kind).toBe('section');
  });
});

// ── Selectors ────────────────────────────────────────────────────────────────

describe('selectSongWords', () => {
  it('joins the same form across songs by mastery key, merging gloss fallback + song associations', () => {
    const a = songWith('a', [
      { form: 'ночь', gloss: 'night', role: 'noun' },
      { form: 'тень', gloss: null, role: null },
    ]);
    const b = songWith('b', [
      { form: 'ночь', gloss: null, role: null }, // no better gloss — keep a's
      { form: 'свет', gloss: 'light', role: null },
    ]);
    const words = selectSongWords([a, b]);

    expect(words.get('ночь')).toMatchObject({ key: 'ночь', gloss: 'night', songIds: ['a', 'b'] });
    expect(words.get('тень')).toMatchObject({ gloss: null, songIds: ['a'] });
    expect(words.get('свет')).toMatchObject({ gloss: 'light', songIds: ['b'] });
  });

  it('keys are trimmed forms; null-word lines contribute nothing', () => {
    const a = songWith('a', [{ form: '  ночь  ', gloss: 'night', role: null }]);
    const b = songWith('b', [{ form: 'ночь', gloss: null, role: null }]);
    const words = selectSongWords([a, b]);
    expect(words.size).toBe(1);
    expect(words.has('ночь')).toBe(true);

    const silent = songWith('c', []);
    expect(selectSongWords([silent]).size).toBe(0);
  });
});

describe('selectKnownWords', () => {
  it('joins mastery with song associations; never-shown records are dropped', () => {
    const mastery: MasteryMap = {
      ночь: { exposures: 2, correct: 2, streak: 2, mistakes: 0, lastSeenMs: 100 },
      тень: { exposures: 3, correct: 1, streak: 0, mistakes: 2, lastSeenMs: 200 },
      свет: graduated,
      призрак: { exposures: 0, correct: 0, streak: 0, mistakes: 0, lastSeenMs: null }, // never shown
    };
    const songs = [songWith('a', [{ form: 'ночь', gloss: 'night', role: null }, { form: 'тень', gloss: null, role: null }])];
    const known = selectKnownWords(mastery, songs);

    const byKey = new Map(known.map((w) => [w.key, w]));
    expect(known.length).toBe(3); // призрак excluded
    expect(byKey.get('ночь')).toMatchObject({ state: 'learning', gloss: 'night', songIds: ['a'], streak: 2 });
    expect(byKey.get('тень')).toMatchObject({ state: 'issue', gloss: null, songIds: ['a'], mistakes: 2 });
    expect(byKey.get('свет')).toMatchObject({ state: 'graduated', songIds: [] }); // mastery without song home
  });
});

describe('selectDueWords', () => {
  const mastery: MasteryMap = {
    проблема: { exposures: 2, correct: 1, streak: 0, mistakes: 5, lastSeenMs: 100 },
    ветер: { exposures: 2, correct: 1, streak: 0, mistakes: 2, lastSeenMs: 200 },
    город: { exposures: 1, correct: 1, streak: 2, mistakes: 0, lastSeenMs: 50 },
    окно: { exposures: 1, correct: 1, streak: 1, mistakes: 0, lastSeenMs: 500 },
    сад: graduated,
    нуль: { exposures: 0, correct: 0, streak: 0, mistakes: 0, lastSeenMs: null },
  };

  it('issues first (most mistakes first), then learning stalest-seen first; graduated/new excluded', () => {
    const due = selectDueWords(mastery, []);
    expect(due.map((w) => w.key)).toEqual(['проблема', 'ветер', 'город', 'окно']);
  });

  it('respects the limit', () => {
    expect(selectDueWords(mastery, [], 2).map((w) => w.key)).toEqual(['проблема', 'ветер']);
  });
});

describe('nextDemoPassage', () => {
  it('empty mastery → the demo song\'s first incomplete arc lesson in narrative order', () => {
    const next = nextDemoPassage({}, []);
    expect(next).not.toBeNull();
    expect(next!.songId).toBe('svetofor');
    expect(next!.sectionId).toBe('intro');
    expect(next!.kind).toBe('arc');
    expect(next!.lessonId).toMatch(/^sdyn-/);
  });

  it('completing a lesson moves the passage forward (no repeats)', () => {
    const first = nextDemoPassage({}, []);
    const second = nextDemoPassage({}, [first!.lessonId]);
    expect(second).not.toBeNull();
    expect(second!.lessonId).not.toBe(first!.lessonId);
  });
});

describe('selectDeferredTargets', () => {
  it('empty mastery → фантомом is explicitly deferred (the honest "still growing" set)', () => {
    const deferred = selectDeferredTargets({});
    const fantom = deferred.find((t) => t.form === 'фантомом');
    expect(fantom).toBeDefined();
    expect(fantom!.subDeckId).toBe('sv-intro');
    expect(fantom!.sectionId).toBe('intro');
    for (const t of deferred) expect(t.gloss.length).toBeGreaterThan(0);
  });

  it('a fully-graduated spine+lyric vocabulary defers nothing', () => {
    const all: MasteryMap = {};
    for (const section of SVETOFOR_SONG.sections) {
      for (const line of section.lines) {
        for (const w of line.words) all[wordKey(w.form)] = graduated;
      }
    }
    expect(selectDeferredTargets(all)).toEqual([]);
  });
});
