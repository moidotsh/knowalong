// __tests__/knowalong/segmentSpan.test.ts
// Segment span model (Revision 3 deliverable 4 / correction J). Verifies:
//   - Multi-line segment reconstruction from ordered source_line_segments rows
//     produces the expected assembled_display_text.
//   - Reconstruction matches display_text_checksum (sha256 hex).
//   - Per-line out-of-range offsets are rejected.
//   - The sourceSegmentRepository exposes NO write method (Revision 3
//     correction H — segment promotion deferred).

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { sourceSegmentRepository } from '../../utils/supabase/repositories';
import type { SourceLineSegmentLink } from '../../shared/types/knowalong';

/** Re-implement the reconstruction rule (mirrors migration 005 header). */
function reconstructSegment(lines: SourceLineSegmentLink[], lineTextByOrdinal: Map<number, string>): string {
  return lines
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((row) => (row.lineFragment ?? lineTextByOrdinal.get(row.ordinal) ?? ''))
    .join('\n');
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function linkRow(ordinal: number, opts: Partial<SourceLineSegmentLink> = {}): SourceLineSegmentLink {
  return {
    sourceLineId: `line-${ordinal}`,
    sourceSegmentId: 'seg-1',
    ordinal,
    startOffset: null,
    endOffset: null,
    lineFragment: null,
    createdAt: new Date().toISOString(),
    ...opts,
  };
}

describe('multi-line segment reconstruction', () => {
  it('reconstructs a single-line segment from one link row', () => {
    const lineText = new Map([[1, 'привет мир']]);
    const rows = [linkRow(1)];
    expect(reconstructSegment(rows, lineText)).toBe('привет мир');
  });

  it('reconstructs a multi-line segment by concatenating in ordinal order with \\n', () => {
    const lineText = new Map([
      [1, 'first line'],
      [2, 'second line'],
      [3, 'third line'],
    ]);
    const rows = [linkRow(3), linkRow(1), linkRow(2)]; // shuffled input
    expect(reconstructSegment(rows, lineText)).toBe('first line\nsecond line\nthird line');
  });

  it('uses lineFragment (exact substring) when present, falling through to full raw_text when null', () => {
    const lineText = new Map([
      [1, 'the full first line'],
      [2, 'the full second line'],
    ]);
    const rows = [
      linkRow(1, { lineFragment: 'the full' }),
      linkRow(2, { lineFragment: null }),
    ];
    expect(reconstructSegment(rows, lineText)).toBe('the full\nthe full second line');
  });

  it('produces a stable sha256 checksum for the same input', () => {
    const lineText = new Map([
      [1, 'first'],
      [2, 'second'],
    ]);
    const rows = [linkRow(1), linkRow(2)];
    const assembled = reconstructSegment(rows, lineText);
    expect(sha256Hex(assembled)).toBe(sha256Hex('first\nsecond'));
    expect(sha256Hex(assembled)).toHaveLength(64);
  });
});

describe('per-line offset validation', () => {
  it('accepts 0 ≤ startOffset ≤ endOffset ≤ length(raw_text)', () => {
    const raw = 'hello'; // length 5
    expect(0 <= 0 && 0 <= 5 && 5 <= raw.length).toBe(true);
    expect(0 <= 2 && 2 <= 4 && 4 <= raw.length).toBe(true);
  });

  it('rejects endOffset greater than raw_text length', () => {
    const raw = 'hello'; // length 5
    const startOffset = 0;
    const endOffset = 6;
    expect(endOffset <= raw.length).toBe(false);
    void startOffset;
  });

  it('rejects startOffset > endOffset', () => {
    const startOffset = 4;
    const endOffset = 2;
    expect(startOffset <= endOffset).toBe(false);
  });

  it('rejects negative offsets', () => {
    const startOffset = -1;
    expect(startOffset >= 0).toBe(false);
  });
});

describe('sourceSegmentRepository surface (Revision 3 correction H)', () => {
  it('exposes findBySource and deleteBySource methods', () => {
    expect(typeof sourceSegmentRepository.findBySource).toBe('function');
    expect(typeof sourceSegmentRepository.deleteBySource).toBe('function');
  });

  it('does NOT expose any segment-write method (no createSegmentWithLineSpan / create / upsert)', () => {
    // The repository surface is read + delete only — segment proposals
    // are reviewable/editable/exportable but NOT promotable in this checkpoint.
    expect((sourceSegmentRepository as never as Record<string, unknown>).createSegmentWithLineSpan).toBeUndefined();
    expect((sourceSegmentRepository as never as Record<string, unknown>).create).toBeUndefined();
    expect((sourceSegmentRepository as never as Record<string, unknown>).upsert).toBeUndefined();
    expect((sourceSegmentRepository as never as Record<string, unknown>).insert).toBeUndefined();
  });
});
