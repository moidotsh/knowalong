// components/journey/tokens.ts
//
// The score register's layout + type tokens. Colors live in the theme
// (constants/theme.ts, `score` family — light and dark restatements);
// this file carries only the measures: type sizes, the milestone-state
// vocabulary, and the desktop geometry from the experience brief.
//
// Type: literary serif for chapter titles and target phrases (PT Serif,
// self-hosted), Golos for prose, PT Mono for ledger labels — the same
// trio the fonts layer wires everywhere.

import type { StepStatus } from '../../utils/journey';

// ── Type scale ───────────────────────────────────────────────────────────

export const JOURNEY_TYPE = {
  /** Chapter title — the score's movement heading. */
  chapterTitle: { phone: 30, wide: 34, lineHeight: 1.12 },
  /** The target-language phrase under study. */
  phrase: { phone: 30, wide: 36, lineHeight: 1.18 },
  /** Milestone titles. */
  milestone: { phone: 18, wide: 19 },
  /** Prose body. */
  body: 16,
  /** Ledger labels — small tracked-out caps (PT Mono). */
  label: 12,
  /** Quiet annotations. */
  caption: 13,
} as const;

/** Letter-spacing for the caps ledger labels. */
export const LABEL_TRACKING = 1.4;

// ── Milestone vocabulary ─────────────────────────────────────────────────
// Shape + color + text (brief §5.3): every state is distinguishable by
// more than color alone.

export interface MilestoneVisual {
  /** The ledger label under/beside the milestone. */
  label: string;
  /** Dot fill key into the score palette. */
  dot: 'accent' | 'paper' | 'rule' | 'warmNote';
  /** Ring color key; 'none' for a bare dot. */
  ring: 'accent' | 'rule' | 'none' | 'warmNote';
  /** Dot diameter. */
  size: number;
  /** Hollow centers for upcoming; filled for done/current. */
  hollow: boolean;
}

export const MILESTONE_VISUALS: Record<StepStatus, MilestoneVisual> = {
  completed: { label: 'Done', dot: 'accent', ring: 'none', size: 12, hollow: false },
  current: { label: 'Now', dot: 'accent', ring: 'accent', size: 16, hollow: false },
  upcoming: { label: 'Ahead', dot: 'paper', ring: 'rule', size: 12, hollow: true },
  'needs-refresh': { label: 'Revise', dot: 'warmNote', ring: 'warmNote', size: 16, hollow: false },
  unavailable: { label: 'Locked', dot: 'rule', ring: 'none', size: 12, hollow: true },
};

// ── Desktop geometry (brief §14) ─────────────────────────────────────────

export const JOURNEY_LAYOUT = {
  /** Left rail width, 960–1279px windows. */
  railNarrow: 96,
  /** Left nav width, ≥1280px windows. */
  railWide: 208,
  /** Reading column cap in the wide shell. */
  mainMax: 720,
  /** Right panel width, ≥1280px windows. */
  panelWidth: 312,
  /** Whole-shell cap. */
  shellMax: 1440,
  /** Single-column cap on tablets (600–959 in the brief's terms). */
  columnMax: 600,
  /** The vertical guide the milestones hang on. */
  railGuideWidth: 2,
} as const;

/** Session cadence tokens (brief: 160–240ms, one eased curve). */
export const JOURNEY_MOTION = {
  fastMs: 160,
  baseMs: 200,
  slowMs: 240,
} as const;
