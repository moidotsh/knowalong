// utils/knowalong/song/librarySongAdapter.ts
//
// Projects a repository-backed learning source (+ its sections/lines) into
// the canonical song model. HONEST by construction (design doc §1.5): the
// adapter never invents translations, glosses or practice availability that
// the repository does not provide — unanalyzed lines stay text-only and
// their sections stay 'unavailable' (Explore shows the source text with an
// uncertainty label, §9.1).
//
// Status mapping (ProcessingStatus → SongPrep):
//   draft          → preparing ("saved — analysis not started")
//   analyzing      → preparing ("analysis in progress")
//   analysis_failed→ preparing ("analysis failed — retry")  [honest failure]
//   analyzed       → partial (or ready when every section has translations)
//   archived       → archived
//
// Pure + deterministic — a pure function of its inputs, unit-testable
// without Supabase or React.

import type { LearningSource, SourceLine, SourceSection } from '../../../shared/types/knowalong';
import type {
  CanonicalLine,
  CanonicalSection,
  CanonicalSectionKind,
  CanonicalSong,
  CanonicalWord,
  SectionPractice,
  SongPrep,
} from './types';

const KIND_BY_SECTION_TYPE: Record<SourceSection['sectionType'], CanonicalSectionKind> = {
  intro: 'intro',
  verse: 'verse',
  chorus: 'chorus',
  bridge: 'bridge',
  outro: 'outro',
  stanza: 'section',
  section: 'section',
};

function prepFor(source: LearningSource): { prep: SongPrep; statusNote: string | null } {
  switch (source.processingStatus) {
    case 'draft':
      return { prep: 'preparing', statusNote: 'Saved — analysis not started yet' };
    case 'analyzing':
      return { prep: 'preparing', statusNote: 'Analysis in progress…' };
    case 'analysis_failed':
      return { prep: 'preparing', statusNote: 'Analysis failed — you can retry it' };
    case 'archived':
      return { prep: 'archived', statusNote: null };
    case 'analyzed':
      return { prep: 'partial', statusNote: null };
  }
}

function lineToCanonical(line: SourceLine, ordinal: number): CanonicalLine {
  // Text-only honesty: no repository translation → no translation. Words are
  // projected only when a translation exists (the current analysis pipeline's
  // minimum signal for a "supported" line); no glosses are fabricated.
  const words: CanonicalWord[] | null = line.translation ? tokenizeSurface(line.rawText) : null;
  return {
    ordinal,
    text: line.rawText,
    translation: line.translation,
    words,
    difficulty: null,
  };
}

/** Split a raw line into surface-word tokens (letters/typographic chars only).
 *  Glosses are NOT known at this stage — they stay null until the analysis
 *  pipeline provides per-word data (Part C/D adapter work). */
function tokenizeSurface(raw: string): CanonicalWord[] {
  return (raw.match(/[\p{L}\p{M}'’-]+/gu) ?? []).map((form) => ({ form, gloss: null, role: null }));
}

function sectionPractice(lines: CanonicalLine[]): SectionPractice {
  // Library songs have no assessed lessons yet (the pack pipeline is Part D):
  // sections with translations are explorable, text-only ones are unavailable.
  return lines.some((l) => l.translation !== null) ? 'explore-only' : 'unavailable';
}

export function librarySongToCanonical(
  source: LearningSource,
  sections: SourceSection[],
  lines: SourceLine[],
): CanonicalSong {
  const { prep, statusNote } = prepFor(source);

  const bySection = new Map<string, SourceLine[]>();
  const unsectioned: SourceLine[] = [];
  for (const line of lines) {
    if (line.sectionId) {
      const bucket = bySection.get(line.sectionId) ?? [];
      bucket.push(line);
      bySection.set(line.sectionId, bucket);
    } else {
      unsectioned.push(line);
    }
  }

  const canonicalSections: CanonicalSection[] = sections
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((section, i) => {
      const sectionLines = (bySection.get(section.id) ?? [])
        .slice()
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((l, li) => lineToCanonical(l, li + 1));
      return {
        id: section.id,
        ordinal: i + 1,
        label: section.label ?? 'Section',
        kind: KIND_BY_SECTION_TYPE[section.sectionType],
        lines: sectionLines,
        practice: sectionPractice(sectionLines),
      };
    });

  // Lines saved before any section analysis: a trailing provisional section,
  // clearly labelled — never silently mixed into an analyzed section.
  if (unsectioned.length > 0) {
    const provisionalLines = unsectioned
      .slice()
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((l, li) => lineToCanonical(l, li + 1));
    canonicalSections.push({
      id: `${source.id}:unsectioned`,
      ordinal: canonicalSections.length + 1,
      label: 'Lines',
      kind: 'section',
      lines: provisionalLines,
      practice: sectionPractice(provisionalLines),
    });
  }

  const totalLines = canonicalSections.reduce((n, s) => n + s.lines.length, 0);
  const translatedLines = canonicalSections.reduce(
    (n, s) => n + s.lines.filter((l) => l.translation !== null).length,
    0,
  );
  const allSectionsTranslated = canonicalSections.length > 0
    && canonicalSections.every((s) => s.lines.length > 0 && s.lines.every((l) => l.translation !== null));

  return {
    id: source.id,
    title: source.title,
    artist: source.artist,
    targetLanguage: source.targetLanguage,
    origin: 'library',
    // An analyzed source with full per-line translation coverage has earned
    // 'ready' as far as honest shelf states go — practice lessons still wait
    // on the pack pipeline, so its sections stay 'explore-only'.
    prep: prep === 'partial' && allSectionsTranslated ? 'ready' : prep,
    statusNote: prep === 'partial' && allSectionsTranslated ? 'Readable — practice preparation pending' : statusNote,
    sections: canonicalSections,
    practice: {
      supportedSections: 0,
      totalSections: canonicalSections.length,
      translatedLines,
      totalLines,
    },
    analysisSourceId: source.id,
  };
}
