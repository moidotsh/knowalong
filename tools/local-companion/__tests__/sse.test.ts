// tools/local-companion/__tests__/sse.test.ts
// SSE format + replay + heartbeat + Last-Event-ID honors.

import { describe, it, expect } from 'bun:test';
import { formatSseFrame, jsonStringifyUtf8 } from '../router';
import type { CompanionJobEvent } from '../../../shared/types/knowalong/companion';

describe('SSE frame formatting', () => {
  it('formatSseFrame emits id/event/data lines', () => {
    const event: CompanionJobEvent = {
      kind: 'event',
      ordinal: 7,
      severity: 'progress',
      stage: 'lemmas',
      message: 'Lemma extraction in progress.',
      payload: { stageIndex: 3 },
    };
    const frame = formatSseFrame(event);
    expect(frame).toContain('id: 7');
    expect(frame).toContain('event: event');
    expect(frame).toContain('"ordinal":7');
    expect(frame.endsWith('\n\n')).toBe(true);
  });

  it('history-truncated frame preserves kind', () => {
    const event: CompanionJobEvent = {
      kind: 'history-truncated',
      ordinal: 999,
      severity: 'warning',
      message: 'Truncated.',
    };
    const frame = formatSseFrame(event);
    expect(frame).toContain('event: history-truncated');
  });

  it('formatSseFrame preserves Cyrillic as literal UTF-8 (not \\uXXXX)', () => {
    const event: CompanionJobEvent = {
      kind: 'event',
      ordinal: 1,
      severity: 'progress',
      stage: 'examples',
      message: 'Russian example',
      payload: { sourceText: 'валяя деляю судячить' },
    };
    const frame = formatSseFrame(event);
    expect(frame).toContain('валяя деляю судячить');
    expect(frame).not.toContain('\\u0432');
  });

  it('formatSseFrame preserves Persian Arabic script as literal UTF-8', () => {
    const event: CompanionJobEvent = {
      kind: 'event',
      ordinal: 1,
      severity: 'progress',
      stage: 'examples',
      message: 'Persian example',
      payload: { sourceText: 'من می‌روم' },
    };
    const frame = formatSseFrame(event);
    expect(frame).toContain('من می‌روم');
  });
});

describe('jsonStringifyUtf8', () => {
  it('preserves Cyrillic literals', () => {
    const out = jsonStringifyUtf8({ gloss: 'Я иду' });
    expect(out).toContain('Я иду');
    expect(out).not.toContain('\\u042f');
  });

  it('keeps control characters escaped', () => {
    const out = jsonStringifyUtf8({ msg: 'line1\nline2\ttab' });
    expect(out).toContain('\\n');
    expect(out).toContain('\\t');
  });

  it('round-trips through JSON.parse identically to default stringify', () => {
    const obj = { ru: 'быть', fr: "j'existe", fa: 'بودن', emoji: '🎉', n: 42 };
    const custom = JSON.parse(jsonStringifyUtf8(obj));
    const standard = JSON.parse(JSON.stringify(obj));
    expect(custom).toEqual(standard);
  });

  it('handles surrogate pairs (emoji) without producing invalid UTF-8', () => {
    const out = jsonStringifyUtf8({ emoji: '🎉' });
    // Surrogates stay escaped (valid JSON, valid UTF-8); parser reconstructs emoji.
    expect(() => JSON.parse(out)).not.toThrow();
    expect(JSON.parse(out).emoji).toBe('🎉');
  });
});
