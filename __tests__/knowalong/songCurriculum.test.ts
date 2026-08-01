// __tests__/knowalong/songCurriculum.test.ts
// Tests for the i+1 song-lesson assembler + the worked Intro curriculum.

import { describe, it, expect } from 'vitest';
import {
  buildArcLessons,
  INTRO_LESSONS,
  type ArcCard,
  type LyricWordArc,
} from '../../utils/knowalong/songCurriculum';

const arcs: LyricWordArc[] = [
  { target: 'а', meaning: 'a word', cards: [{ surfaceForm: 'а', meaning: 'a', words: [{ form: 'а', gloss: 'a', role: 'particle' }] }] },
  {
    target: 'б',
    meaning: 'b word',
    cards: [
      { surfaceForm: 'б', meaning: 'b', words: [{ form: 'б', gloss: 'b', role: 'noun' }] },
      { surfaceForm: 'б я', meaning: 'b I', words: [{ form: 'б', gloss: 'b', role: 'noun' }, { form: 'я', gloss: 'I', role: 'pronoun' }] },
    ],
  },
];
const culmination: ArcCard = {
  surfaceForm: 'а б',
  meaning: 'a b',
  words: [{ form: 'а', gloss: 'a', role: 'particle' }, { form: 'б', gloss: 'b', role: 'noun' }],
};

describe('buildArcLessons', () => {
  it('emits one lesson per arc + a culminating line lesson', () => {
    const lessons = buildArcLessons(arcs, culmination, { idPrefix: 't', sectionLabel: 'S' });
    expect(lessons.length).toBe(arcs.length + 1);
    expect(lessons.map((l) => l.title)).toEqual(['S · а', 'S · б', 'S · full line']);
  });

  it('arc lesson steps mirror the arc cards', () => {
    const lessons = buildArcLessons(arcs, culmination, { idPrefix: 't' });
    expect(lessons[0].steps.length).toBe(1); // arc а — 1 card
    expect(lessons[1].steps.length).toBe(2); // arc б — 2 cards
    expect(lessons[1].steps.map((s) => s.surfaceForm)).toEqual(['б', 'б я']);
  });

  it('culminating lesson is last + carries the full line', () => {
    const lessons = buildArcLessons(arcs, culmination, { idPrefix: 't' });
    const culm = lessons[lessons.length - 1];
    expect(culm.steps.length).toBe(1);
    expect(culm.steps[0].surfaceForm).toBe('а б');
  });

  it('lesson + step ids are unique', () => {
    const lessons = buildArcLessons(arcs, culmination, { idPrefix: 't' });
    const lessonIds = lessons.map((l) => l.id);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    const stepIds = lessons.flatMap((l) => l.steps.map((s) => s.itemId));
    expect(new Set(stepIds).size).toBe(stepIds.length);
  });

  it('is deterministic (two builds produce identical ids)', () => {
    const a = buildArcLessons(arcs, culmination, { idPrefix: 't' });
    const b = buildArcLessons(arcs, culmination, { idPrefix: 't' });
    expect(a.map((l) => l.id)).toEqual(b.map((l) => l.id));
    expect(a.flatMap((l) => l.steps.map((s) => s.itemId))).toEqual(b.flatMap((l) => l.steps.map((s) => s.itemId)));
  });
});

describe('INTRO_LESSONS (worked section)', () => {
  it('covers each Intro lyric word as its own arc + a culminating line', () => {
    expect(INTRO_LESSONS.length).toBe(5); // эй / будто / полетев / фантомом + full line
    const titles = INTRO_LESSONS.map((l) => l.title);
    expect(titles).toEqual(['Intro · эй', 'Intro · будто', 'Intro · полетев', 'Intro · фантомом', 'Intro · full line']);
    const culm = INTRO_LESSONS[INTRO_LESSONS.length - 1];
    expect(culm.steps[0].surfaceForm).toBe('А, будто полетев фантомом');
  });

  it('arc cards reuse the lyric target in known-word contexts (i+1)', () => {
    // The будто arc's second card uses будто (new) + я/вижу-equivalent known words.
    const budto = INTRO_LESSONS.find((l) => l.title === 'Intro · будто')!;
    expect(budto.steps.length).toBe(2);
    const ctx = budto.steps[1];
    expect(ctx.words.map((w) => w.form)).toContain('будто');
    expect(ctx.words.length).toBeGreaterThan(1); // target + known scaffolding
  });
});
