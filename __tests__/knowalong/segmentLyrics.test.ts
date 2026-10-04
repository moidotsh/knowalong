// __tests__/knowalong/segmentLyrics.test.ts
// Import-flow segmentation (design doc §1.3/§4.1–4.2): blank-line splits,
// conservative stanza-label extraction, visible label removal, verbatim lines.

import { describe, it, expect } from 'vitest';
import { segmentLyrics, fallbackSegmentLabel } from '../../utils/knowalong/song/segmentLyrics';

describe('segmentLyrics', () => {
  it('splits on blank lines into verbatim chunks', () => {
    const { segments, removedLabels } = segmentLyrics('line one\nline two\n\nline three');
    expect(removedLabels).toHaveLength(0);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ label: null, labelRaw: null, lines: ['line one', 'line two'] });
    expect(segments[1]).toEqual({ label: null, labelRaw: null, lines: ['line three'] });
  });

  it('extracts a bracketed [Chorus] label and records the removal visibly', () => {
    const { segments, removedLabels } = segmentLyrics('[Verse 1]\nfirst line\n\n[Chorus]\nhook line');
    expect(segments).toHaveLength(2);
    expect(segments[0].label).toBe('Verse 1');
    expect(segments[0].labelRaw).toBe('[Verse 1]');
    expect(segments[0].lines).toEqual(['first line']);
    expect(segments[1].label).toBe('Chorus');
    expect(removedLabels).toHaveLength(2);
    expect(removedLabels[1]).toEqual({ segmentIndex: 1, raw: '[Chorus]' });
  });

  it('understands Cyrillic stanza labels («Припев:»)', () => {
    const { segments } = segmentLyrics('Куплет 1:\nраз\n\nПрипев:\nдва');
    expect(segments[0].label).toBe('Куплет 1');
    expect(segments[1].label).toBe('Припев');
  });

  it('keeps arbitrary bracketed text as a lyric line (conservative)', () => {
    const { segments, removedLabels } = segmentLyrics('[produced by someone]\nreal line');
    expect(removedLabels).toHaveLength(0);
    expect(segments).toHaveLength(1);
    expect(segments[0].label).toBeNull();
    expect(segments[0].lines).toEqual(['[produced by someone]', 'real line']);
  });

  it('a label without a blank line still starts a new section', () => {
    const { segments } = segmentLyrics('verse line\n(Chorus)\nhook line');
    expect(segments).toHaveLength(2);
    expect(segments[0].lines).toEqual(['verse line']);
    expect(segments[1].label).toBe('Chorus');
    expect(segments[1].lines).toEqual(['hook line']);
  });

  it('normalizes CRLF and drops whitespace-only gaps', () => {
    const { segments } = segmentLyrics('a\r\n\r\n \r\n\r\nb');
    expect(segments).toHaveLength(2);
    expect(segments[0].lines).toEqual(['a']);
    expect(segments[1].lines).toEqual(['b']);
  });

  it('returns no segments for empty input', () => {
    expect(segmentLyrics('').segments).toHaveLength(0);
    expect(segmentLyrics('   \n  \n').segments).toHaveLength(0);
  });

  it('fallbackSegmentLabel is stable and human ("Section 1")', () => {
    expect(fallbackSegmentLabel(0)).toBe('Section 1');
    expect(fallbackSegmentLabel(3)).toBe('Section 4');
  });
});
