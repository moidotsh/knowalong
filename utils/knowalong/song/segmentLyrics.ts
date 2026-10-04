// utils/knowalong/song/segmentLyrics.ts
//
// Deterministic, conservative lyric segmentation for the import flow
// (design doc §1.3 step 3 / §4.1–4.2). Splits pasted lyrics into PROVISIONAL
// sections on blank lines, and extracts bracketed/leading stanza labels
// (「[Chorus]」, «Припев:») ONLY when they match a known stanza word —
// anything else stays a lyric line. Label removal is always visible (the
// removed raw text is returned), never silent.
//
// Pure + reversible: segments carry the preserved lines; nothing is
// normalized or discarded. "Section 1" is an acceptable label when no
// evidence exists (§4.2 — do not invent chorus boundaries).

export interface LyricSegment {
  /** Detected stanza label ('Chorus'), or null when the chunk had none. */
  label: string | null;
  /** The raw label text as removed from the source (visible removal), or null. */
  labelRaw: string | null;
  /** The chunk's non-empty lines, preserved verbatim (trimmed edges only). */
  lines: string[];
}

export interface SegmentationResult {
  segments: LyricSegment[];
  /** Every label removal, in source order — surfaced in the import preview. */
  removedLabels: Array<{ segmentIndex: number; raw: string }>;
}

/** Stanza words recognized as labels. Conservative on purpose: a line like
 *  «[Verse 3: someone talking]» still matches on its leading stanza word;
 *  arbitrary bracketed text does NOT match and stays a lyric line. */
const STANZA_WORDS = [
  'intro', 'verse', 'chorus', 'bridge', 'refrain', 'outro', 'hook', 'pre-chorus', 'post-chorus',
  'куплет', 'припев', 'бридж', 'интро', 'аутро', 'проигрыш', 'запев',
  'couplet', 'pont',
];

function normalizeForMatch(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Does this line read as a stanza label? Bracketed form preferred
 *  ([Chorus] / (Припев)), then a short line ending in ':' built around a
 *  stanza word. Free-standing stanza-word lines are NOT labels (too risky). */
function matchLabel(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 48) return null;

  const bracketed = trimmed.match(/^[\[(【](.+?)[\])】]:?$/);
  if (bracketed) {
    const inner = normalizeForMatch(bracketed[1]);
    if (STANZA_WORDS.some((w) => inner === w || inner.startsWith(w + ' '))) {
      return trimmed;
    }
    return null; // bracketed but not a stanza word → lyric text (conservative)
  }

  if (trimmed.endsWith(':')) {
    const head = normalizeForMatch(trimmed.slice(0, -1));
    if (head.length > 0 && head.length <= 24 && STANZA_WORDS.some((w) => head === w || head.startsWith(w + ' '))) {
      return trimmed;
    }
  }
  return null;
}

/** Segment pasted lyrics into provisional sections. Blank lines split chunks;
 *  a recognized stanza label heads its chunk. A label on a chunk that already
 *  has lines (no blank line before it) STARTS A NEW section — song publishers
 *  rely on that convention. */
export function segmentLyrics(raw: string): SegmentationResult {
  const removedLabels: SegmentationResult['removedLabels'] = [];
  const segments: LyricSegment[] = [];

  const physicalLines = (raw ?? '').replace(/\r\n?/g, '\n').split('\n');

  let current: LyricSegment = { label: null, labelRaw: null, lines: [] };
  const flush = () => {
    if (current.labelRaw !== null || current.lines.length > 0) segments.push(current);
  };

  for (const physical of physicalLines) {
    const line = physical.trim();

    if (line === '') {
      // Blank line = section boundary (if anything is open).
      flush();
      current = { label: null, labelRaw: null, lines: [] };
      continue;
    }

    const label = matchLabel(line);
    if (label) {
      // A label always begins a section: close whatever is open first.
      flush();
      const friendly = friendlyLabel(label);
      current = { label: friendly, labelRaw: label, lines: [] };
      removedLabels.push({ segmentIndex: segments.length, raw: label });
      continue;
    }

    current.lines.push(line);
  }
  flush();

  return { segments, removedLabels };
}

/** A display label for a detected raw label: the matched stanza word,
 *  capitalized ('[Verse 2]' → 'Verse 2'; 'Припев:' → 'Припев'). */
function friendlyLabel(rawLabel: string): string {
  const inner = rawLabel.replace(/^[\[(【](.+?)[\])】]:?$/, '$1').replace(/:\s*$/, '').trim();
  const norm = normalizeForMatch(inner);
  const hit = STANZA_WORDS.find((w) => norm === w || norm.startsWith(w + ' '));
  if (!hit) return inner || 'Section';
  const rest = norm.slice(hit.length).trim();
  const capitalized = hit.charAt(0).toUpperCase() + hit.slice(1);
  return rest ? `${capitalized} ${rest}` : capitalized;
}

/** Human-facing section label for a segment without a detected label. */
export function fallbackSegmentLabel(index: number): string {
  return `Section ${index + 1}`;
}
