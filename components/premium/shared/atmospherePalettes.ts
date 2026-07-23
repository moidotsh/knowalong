// components/premium/shared/atmospherePalettes.ts
// Shared atmosphere palette definitions for the light-mode premium kit.
//
// Seven surface semantics (auth/setup/training/goal/instructions/privacy/
// analytics) — domain-agnostic, every consumer benefits. Every palette stop
// is tuned for light surfaces:
//   • Backgrounds are pale tints (cream, ice, lavender).
//   • Saturation is softer (looks richer against a bright surface).
//   • Luminance is higher (orbs glow softly instead of cutting through dark).
//   • Orb opacity is lower (5-10% alpha instead of 10-15%).
//
// Each surface gets a 3-orb palette stop that reflects its semantic role:
//   • auth          — soft sky-blue on pale ice (was deep navy on black)
//   • setup         — cool blue-to-lavender on cream
//   • training      — warm peach-to-rose on cream
//   • goal          — teal-to-mint on pale aqua
//   • instructions  — soft cobalt on pale ice (companion to setup)
//   • privacy       — sage-to-mint on pale aqua (trust signal)
//   • analytics     — periwinkle-to-lilac on pale lavender

import { theme } from '../../../constants';

export type AtmosphereSurface =
  | 'auth'
  | 'setup'
  | 'training'
  | 'goal'
  | 'instructions'
  | 'privacy'
  | 'analytics';

export interface AtmospherePalette {
  /** Primary orb — typically top-left, largest. */
  orb1: string;
  /** Secondary orb — typically bottom-right. */
  orb2: string;
  /** Tertiary orb — smaller, center-right. */
  orb3: string;
}

// Light-tuned palette source colors. These are kept here (not in theme.ts)
// because the atmosphere palette is a separate concern from the UI palette —
// these hues are layered into the background field, not used for text or
// interactive elements. Keeping them local also makes consumer override
// easier: change the palette here without touching the canonical theme.
const LIGHT_HUES = {
  skyBlue: '#7DD3FC',     // soft sky blue
  cobalt: '#93C5FD',      // soft cobalt
  lavender: '#C4B5FD',    // pale lavender
  periwinkle: '#A5B4FC',  // periwinkle
  lilac: '#D8B4FE',       // lilac
  peach: '#FED7AA',       // warm peach
  rose: '#FECDD3',        // soft rose
  coral: '#FCA5A5',       // soft coral
  teal: '#99F6E4',        // soft teal
  mint: '#BBF7D0',        // pale mint
  sage: '#A7F3D0',        // sage
  aqua: '#A5F3FC',        // pale aqua
  amber: '#FDE68A',       // soft amber
};

function rgba(hex: string, alpha: number): string {
  // Convert #RRGGBB → rgba(r, g, b, alpha). Used instead of `${hex}${alphaHex}`
  // because that pattern only works for 6-digit hex + 2-digit alpha; some
  // hues here are easier to tune by alpha directly.
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Per-surface palette stops for light backgrounds. Alpha is deliberately
 * low (0.06-0.12) — against a pale background, even modest color reads
 * clearly. Higher alpha would tip into "candy" territory and fight the
 * calm-air pillar.
 */
export const PALETTES: Record<AtmosphereSurface, AtmospherePalette> = {
  auth: {
    // Soft sky-blue on pale ice — login + register.
    orb1: rgba(LIGHT_HUES.skyBlue, 0.10),
    orb2: rgba(LIGHT_HUES.periwinkle, 0.08),
    orb3: rgba(LIGHT_HUES.lavender, 0.05),
  },
  setup: {
    // Cool blue-to-lavender on cream — onboarding setup phase.
    orb1: rgba(LIGHT_HUES.cobalt, 0.10),
    orb2: rgba(LIGHT_HUES.lavender, 0.08),
    orb3: rgba(LIGHT_HUES.aqua, 0.06),
  },
  training: {
    // Warm peach-to-rose on cream — onboarding training phase.
    orb1: rgba(LIGHT_HUES.peach, 0.10),
    orb2: rgba(LIGHT_HUES.rose, 0.08),
    orb3: rgba(LIGHT_HUES.coral, 0.05),
  },
  goal: {
    // Teal-to-mint on pale aqua — onboarding goal phase.
    orb1: rgba(LIGHT_HUES.teal, 0.10),
    orb2: rgba(LIGHT_HUES.mint, 0.08),
    orb3: rgba(LIGHT_HUES.aqua, 0.06),
  },
  instructions: {
    // Soft cobalt on pale ice — companion to setup.
    orb1: rgba(LIGHT_HUES.cobalt, 0.10),
    orb2: rgba(LIGHT_HUES.aqua, 0.06),
    orb3: rgba(LIGHT_HUES.periwinkle, 0.05),
  },
  privacy: {
    // Sage-to-mint on pale aqua — trust signal.
    orb1: rgba(LIGHT_HUES.sage, 0.10),
    orb2: rgba(LIGHT_HUES.mint, 0.08),
    orb3: rgba(LIGHT_HUES.aqua, 0.06),
  },
  analytics: {
    // Periwinkle-to-lilac on pale lavender — matches setup, signals continuity.
    orb1: rgba(LIGHT_HUES.periwinkle, 0.10),
    orb2: rgba(LIGHT_HUES.lilac, 0.08),
    orb3: rgba(LIGHT_HUES.cobalt, 0.06),
  },
};
