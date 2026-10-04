// utils/journey/types.ts
//
// The learner journey's conceptual entities — the UI design sketch from
// the consumer-experience brief, adapted to this repo. These are PROTOTYPE
// fixtures types, not a backend pack schema: everything here is
// deterministic sample content rendered by the new experience.
//
// Hierarchy the learner sees: Journey → Chapter → Step → Session.
// Collection items (media) anchor chapters; Notebook entries are views
// over knowledge evidence + media word data. One canonical media id
// connects Collection, chapter, reader, session and Notebook.

// ── Journey shape ────────────────────────────────────────────────────────

/** The five visible milestone states (brief §5.3). Derived by selectors —
 *  never stored as mutable per-screen copies. */
export type StepStatus = 'completed' | 'current' | 'upcoming' | 'needs-refresh' | 'unavailable';

export type StepKind =
  | 'explore'
  | 'foundation'
  | 'practice'
  | 'review'
  | 'return-to-source'
  | 'transfer';

export interface Journey {
  id: string;
  language: string;
  languageLabel: string;
  chapterIds: string[];
}

export interface Chapter {
  id: string;
  journeyId: string;
  /** 1-based display order within the journey. */
  number: number;
  title: string;
  /** The concrete destination sentence ("Understand the opening verse."). */
  destination: string;
  mediaId: string | null;
  stepIds: string[];
  /** Why this chapter follows the previous one — shown in previews. */
  overlapNote?: string;
  /** True when the chapter needs a media entitlement the learner lacks. */
  requiresPurchaseOf?: string;
}

export interface JourneyStep {
  id: string;
  chapterId: string;
  kind: StepKind;
  title: string;
  /** One sentence: how this step serves the chapter destination. */
  purpose: string;
  mediaId: string | null;
  estimatedMinutes: number | null;
  /** Session plans that open from this step, in order ("Session 1 of 2"). */
  sessionPlanIds: string[];
  /** Steps that must be completed before ASSESSED practice here. */
  prerequisiteIds: string[];
  /** Assessed steps gate on prerequisites; exploratory steps stay browsable. */
  assessed: boolean;
  /** Word/phrase keys this step teaches or refreshes (drives review state). */
  focusKeys: string[];
}

// ── Media (Collection) ───────────────────────────────────────────────────

export type MediaKind = 'song' | 'prose';
export type MediaAccess = 'free' | 'purchasable' | 'draft';

/** One aligned word occurrence inside a passage line. */
export interface PassageWord {
  /** Surface form as printed in the line. */
  form: string;
  /** Dictionary form. */
  lemma: string;
  /** Stable, language-scoped knowledge identity (lemma-based). */
  wordKey: string;
  meaning: string;
  /** Plain-language role shown in help ("a doing word", "a naming word"). */
  roleLabel?: string;
  transliteration?: string;
  /** Same sense-family as this key (transfer support, e.g. светит ↔ свет). */
  familyOf?: string;
  /** Plain-language pattern note ("не + doing word = not doing it"). */
  patternNote?: string;
}

export interface PassageLine {
  id: string;
  ordinal: number;
  text: string;
  translation: string;
  transliteration?: string;
  /** Words aligned to whitespace tokens of `text` (punctuation trimmed). */
  words: PassageWord[];
}

export interface Passage {
  id: string;
  label: string;
  kind: 'verse' | 'prose';
  lines: PassageLine[];
}

export interface MediaItem {
  /** Canonical id across Collection, chapters, reader, sessions, Notebook. */
  id: string;
  kind: MediaKind;
  title: string;
  /** Artist/source label when legitimate; null for originals. */
  subtitle: string | null;
  language: string;
  /** Honest provenance label, e.g. "Original practice text". */
  originLabel: string;
  /** Artwork key → lightweight original artwork (see DuskArtworkVector). */
  artwork: 'dusk' | 'north' | 'metro';
  access: MediaAccess;
  /** Illustrative one-time price; display currency is explicit in UI. */
  priceUsd?: number;
  passages: Passage[];
  /** What the purchase includes (purchasable items). */
  included?: string[];
}

// ── Sessions (the one player) ────────────────────────────────────────────

export type SessionPlanKind = 'step' | 'review' | 'transfer';

export interface PhraseRevealActivity {
  id: string;
  kind: 'phrase-reveal';
  /** Large target-language text. */
  phrase: string;
  meaning: string;
  transliteration?: string;
  /** What to notice, in plain language. */
  focus: string;
  wordKeys: string[];
  sourceLineId?: string;
  /** Reveals are encounters, never assessments. */
  unscored: true;
}

export interface MeaningChoiceActivity {
  id: string;
  kind: 'meaning-choice';
  prompt: string;
  phrase: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  wordKey?: string;
  sourceLineId?: string;
  unscored: false;
}

export interface BuilderChip {
  id: string;
  text: string;
  /** 0-based slot in the answer; null for a distractor. */
  correctPosition: number | null;
}

export interface PhraseBuilderActivity {
  id: string;
  kind: 'phrase-builder';
  /** The English sentence to reconstruct. */
  prompt: string;
  chips: BuilderChip[];
  /** Ordered target tokens (chip texts by correctPosition). */
  answer: string[];
  translation: string;
  sourceLineId?: string;
  wordKeys: string[];
  unscored: false;
}

export interface PassageReturnActivity {
  id: string;
  kind: 'passage-return';
  mediaId: string;
  passageId: string;
  lineIds: string[];
  highlightWordKeys: string[];
  /** The role the practised item plays in the passage. */
  note: string;
  unscored: true;
}

export interface RecapActivity {
  id: string;
  kind: 'recap';
  /** "Practised" lines, each a plain-language outcome label. */
  practised: string[];
  /** Honest uncertainty note ("ready to revisit" etc.). */
  uncertain?: string;
  unscored: true;
}

export type SessionActivity =
  | PhraseRevealActivity
  | MeaningChoiceActivity
  | PhraseBuilderActivity
  | PassageReturnActivity
  | RecapActivity;

export interface SessionPlan {
  id: string;
  /** Null for standalone review/transfer sessions. */
  stepId: string | null;
  kind: SessionPlanKind;
  title: string;
  /** Quiet source label ("City lights — Verse 1"). */
  sourceLabel: string;
  /** 1-based index within the step's plan + total, when the fixture
   *  actually models a multi-session step. */
  sequenceIndex: number;
  sessionCount: number;
  activities: SessionActivity[];
}

// ── Knowledge evidence (Notebook) ────────────────────────────────────────

export type EvidenceStatus = 'encountered' | 'practised' | 'recalled';

export interface EvidenceRecord {
  wordKey: string;
  status: EvidenceStatus;
  correct: number;
  incorrect: number;
  /** Assisted exposures ("Show me" / help usage) — never counted as recall. */
  assisted: number;
  /** Day stamps 'YYYY-MM-DD' (local). */
  lastSeenDay: string;
  /** The day a refresh becomes genuinely useful. */
  dueOn: string;
  sourceMediaId: string;
  sourceLineId?: string;
}

// ── Persistence record (the pinned session) ──────────────────────────────

export interface PinnedSessionAnswer {
  activityId: string;
  outcome: 'correct' | 'incorrect' | 'revealed' | 'skipped';
  assisted: boolean;
}

export interface PinnedSession {
  planId: string;
  stepId: string | null;
  contentRevision: string;
  currentIndex: number;
  answers: PinnedSessionAnswer[];
  /** Day the session was pinned (for the returning-after-a-break note). */
  pinnedOnDay: string;
}
