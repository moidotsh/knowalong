// utils/knowalong/song/scriptDetect.ts
//
// Script-based language HINTS for the import flow (design doc §1.3 step 2 /
// §4.2). Script statistics are a hint, never a verdict: Arabic script alone
// cannot establish Persian, Cyrillic alone cannot establish Russian over
// Serbian. The UI surfaces the hint and asks the learner to confirm.

export type ScriptFamily = 'cyrillic' | 'arabic' | 'armenian' | 'latin' | 'mixed' | 'none';

export interface LanguageHint {
  script: ScriptFamily;
  /** Suggested target-language code, or null when the script can't suggest one. */
  suggested: string | null;
  /** Honest note to show next to the language selector. */
  note: string | null;
}

const SCRIPT_RANGES: Array<{ family: ScriptFamily; re: RegExp }> = [
  { family: 'cyrillic', re: /[\u0400-\u04FF]/g },
  { family: 'arabic', re: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g },
  { family: 'armenian', re: /[\u0530-\u058F]/g },
  { family: 'latin', re: /[A-Za-z\u00C0-\u024F]/g },
];

function letterCounts(text: string): Partial<Record<ScriptFamily, number>> {
  const counts: Partial<Record<ScriptFamily, number>> = {};
  for (const { family, re } of SCRIPT_RANGES) {
    counts[family] = (text.match(re) ?? []).length;
  }
  return counts;
}

/** Detect the dominant script of a pasted lyric draft and derive a hint. */
export function detectLanguageHint(text: string): LanguageHint {
  const counts = letterCounts(text ?? '');
  const total = Object.values(counts).reduce<number>((n, c) => n + (c ?? 0), 0);

  if (total === 0) return { script: 'none', suggested: null, note: null };

  const entries = (Object.entries(counts) as Array<[ScriptFamily, number]>)
    .filter(([, n]) => (n ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  const dominant = entries[0];
  const dominantShare = (dominant[1] ?? 0) / total;
  const script: ScriptFamily = dominantShare >= 0.8 ? dominant[0] : 'mixed';

  switch (script) {
    case 'cyrillic':
      return {
        script,
        suggested: 'ru',
        note: 'Cyrillic script detected — confirm Russian (Serbian Cyrillic also uses it)',
      };
    case 'arabic':
      return {
        script,
        suggested: 'fa',
        note: 'Arabic script detected — confirm the language (Persian and others share it)',
      };
    case 'armenian':
      return { script, suggested: 'hy', note: 'Armenian script detected' };
    case 'latin':
      return {
        script,
        suggested: null,
        note: 'Latin script — pick the language (French, Bosnian…)',
      };
    case 'mixed':
      return {
        script,
        suggested: null,
        note: 'Mixed scripts detected — confirm the main language; mixed-language spans will be marked',
      };
    case 'none':
      return { script, suggested: null, note: null };
  }
}
