// utils/knowalong/song/validateLyricDraft.ts
//
// Client-side lyric-draft validation for the import flow (design doc §1.5
// "Empty, markup-heavy or nonsense text" row). Runs BEFORE any paid/remote
// work: no job is submitted while an error is open, the draft is never
// cleared, and offending regions are identified so the learner can fix them.
//
// Conservative by design — false blockers are worse than a missed warning,
// so only structural evidence (emptiness, size, markup density, letterless
// lines) produces ERRORS; everything softer is a WARNING.

export type LyricDraftIssueCode =
  | 'empty'
  | 'too-long'
  | 'markup-heavy'
  | 'letterless-lines'
  | 'single-line'
  | 'very-long-lines';

export interface LyricDraftIssue {
  code: LyricDraftIssueCode;
  severity: 'error' | 'warning';
  message: string;
  /** 1-based line number of the first offending region, when identifiable. */
  regionLine: number | null;
}

/** Initial per-job input ceiling (§4.1 assumption: 20,000 chars). */
export const MAX_LYRIC_CHARS = 20_000;

const MARKUP_PATTERNS: RegExp[] = [
  /<\s*(\/?)(p|div|span|br|b|i|em|strong|a|section)\b/i, // HTML tags
  /\[[a-z0-9 _:-]{1,40}\]:\s*https?:\/\//i, // markdown link refs
  /https?:\/\/\S+/i, // bare URLs
  /&[a-z]+;|&#\d+;/i, // HTML entities
];

function isMarkupLine(line: string): boolean {
  return MARKUP_PATTERNS.some((re) => re.test(line));
}

function letterRatio(line: string): number {
  const letters = line.match(/\p{L}/gu)?.length ?? 0;
  return line.length === 0 ? 1 : letters / line.length;
}

export function validateLyricDraft(raw: string): LyricDraftIssue[] {
  const issues: LyricDraftIssue[] = [];
  const text = raw ?? '';
  const physicalLines = text.replace(/\r\n?/g, '\n').split('\n');
  const contentLines = physicalLines.map((l) => l.trim()).filter((l) => l !== '');

  if (contentLines.length === 0) {
    issues.push({
      code: 'empty',
      severity: 'error',
      message: 'Paste the song text first — it stays on this device until you save it.',
      regionLine: null,
    });
    return issues;
  }

  if (text.length > MAX_LYRIC_CHARS) {
    issues.push({
      code: 'too-long',
      severity: 'error',
      message: `That's ${text.length.toLocaleString()} characters — the first version takes up to ${MAX_LYRIC_CHARS.toLocaleString()}. Trim or split the paste.`,
      regionLine: null,
    });
  }

  const markupLines = physicalLines
    .map((rawLine, i) => ({ line: rawLine.trim(), no: i + 1 }))
    .filter(({ line }) => line !== '' && isMarkupLine(line));
  if (contentLines.length >= 4 && markupLines.length / contentLines.length >= 0.3) {
    issues.push({
      code: 'markup-heavy',
      severity: 'error',
      message: 'Most of this paste looks like code or markup, not lyrics. Check the highlighted line and paste the plain text.',
      regionLine: markupLines[0]?.no ?? null,
    });
  }

  // Physical line numbers (not content indices) so the learner can find the
  // region in their paste — same numbering the markup check uses.
  const letterless = physicalLines
    .map((rawLine, i) => ({ line: rawLine.trim(), no: i + 1 }))
    .filter(({ line }) => line !== '' && letterRatio(line) < 0.2);
  if (contentLines.length >= 4 && letterless.length / contentLines.length >= 0.5) {
    issues.push({
      code: 'letterless-lines',
      severity: 'error',
      message: 'Half or more of these lines have almost no letters — that doesn\'t read as lyrics yet.',
      regionLine: letterless[0]?.no ?? null,
    });
  }

  if (contentLines.length === 1) {
    issues.push({
      code: 'single-line',
      severity: 'warning',
      message: 'Only one line so far — a passage works best with at least a few lines.',
      regionLine: null,
    });
  }

  const veryLong = physicalLines
    .map((rawLine, i) => ({ line: rawLine.trim(), no: i + 1 }))
    .filter(({ line }) => line !== '' && line.length > 400);
  if (veryLong.length > 0) {
    issues.push({
      code: 'very-long-lines',
      severity: 'warning',
      message: 'Some lines are extremely long — check that line breaks survived the paste.',
      regionLine: veryLong[0]?.no ?? null,
    });
  }

  return issues;
}
