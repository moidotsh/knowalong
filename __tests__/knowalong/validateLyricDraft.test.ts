// __tests__/knowalong/validateLyricDraft.test.ts
//
// Part A §1.5 — honest pre-flight for pasted lyrics. Errors fire BEFORE any
// paid/remote work (no job while an error is open); warnings never block.
// Pins the structural evidence rules (empty / too-long / markup-heavy /
// letterless lines) and the physical line numbers reported for regions.

import { describe, it, expect } from 'vitest';
import { validateLyricDraft } from '../../utils/knowalong/song/validateLyricDraft';

const codes = (raw: string) => validateLyricDraft(raw).map((i) => i.code);

describe('validateLyricDraft — errors (block the job)', () => {
  it('whitespace-only paste → a single honest "empty" error', () => {
    const issues = validateLyricDraft('   \n\t\n  ');
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'empty', severity: 'error', regionLine: null });
  });

  it('completely empty paste → the same "empty" error', () => {
    expect(codes('')).toEqual(['empty']);
  });

  it('paste beyond the per-job ceiling → too-long, with the char count in the message', () => {
    const issues = validateLyricDraft('строка\n'.repeat(4500)); // 31,500 chars
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'too-long', severity: 'error', regionLine: null });
    expect(issues[0].message).toContain('20,000');
  });

  it('markup-dominated paste → markup-heavy error pointing at the first markup line', () => {
    const raw = [
      '<p>Раз</p>',
      '<div>Два</div>',
      'https://example.com/lyrics',
      '&nbsp;',
      'ночь',
      'улица',
    ].join('\n');
    const issues = validateLyricDraft(raw);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'markup-heavy', severity: 'error', regionLine: 1 });
  });

  it('a stray tag or URL in mostly-clean lyrics does NOT trip the markup error (conservative)', () => {
    const raw = [
      'ночь улица фонарь аптека',
      'бессмысленный и тусклый свет',
      'читай внимательно <br>',
      'четвёртая чистая строка',
      'пятая строка без разметки',
    ].join('\n');
    expect(codes(raw)).toEqual([]);
  });

  it('letterless-line majority → error with the PHYSICAL line number (blank lines included)', () => {
    const raw = ['', '1234567890', '!!!???', '...', '---', 'ночь', 'улица'].join('\n');
    const issues = validateLyricDraft(raw);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'letterless-lines', severity: 'error', regionLine: 2 });
  });
});

describe('validateLyricDraft — warnings (never block)', () => {
  it('one content line → single-line warning only', () => {
    const issues = validateLyricDraft('одна единственная строка');
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'single-line', severity: 'warning', regionLine: null });
  });

  it('an over-long line → very-long-lines warning at its physical line number', () => {
    const raw = ['', 'короткая строка', 'а'.repeat(401)].join('\n');
    const issues = validateLyricDraft(raw);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'very-long-lines', severity: 'warning', regionLine: 3 });
  });

  it('real lyrics produce no issues at all', () => {
    const raw = 'Ночь, улица, фонарь, аптека,\nБессмысленный и тусклый свет.\n';
    expect(validateLyricDraft(raw)).toEqual([]);
  });
});
