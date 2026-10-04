// components/knowalong/nightMetro.ts
// NIGHT METRO — the domain components' shared signature vocabulary. The
// palette and type families live in constants/theme.ts; this module holds
// the one mapping the Night Metro components all read: a station's service
// state → its line color. The mastery ladder maps onto the transit metaphor
// directly:
//
//   known  — the train has been here; the stop is served (status.success,
//            the timetable's "on time" green)
//   seen   — the train is here now (brand — the filament amber, lit)
//   new    — a signal stop: the learner stumbled here (status.error)
//   locked — beyond the terminus; not yet in service (textMuted, unlit)
//
// Pure over (colors, state) — no hooks, no component code, so the mapping
// is unit-testable without a provider.

import type { ColorPalette } from '../../constants';

/** A station's service state on the line. */
export type StationState = 'known' | 'seen' | 'new' | 'locked';

/** Every state, in service order — consumers rendering legends iterate this. */
export const STATION_STATES: readonly StationState[] = ['known', 'seen', 'new', 'locked'];

/**
 * The line color for a station state. Both modes resolve through the live
 * palette (the light timetable's fill amber vs. the night service's
 * filament amber differ; the mapping is the same shape).
 */
export function stationColor(colors: ColorPalette, state: StationState): string {
  switch (state) {
    case 'known':
      return colors.status.success;
    case 'seen':
      return colors.brand;
    case 'new':
      return colors.status.error;
    case 'locked':
      return colors.textMuted;
  }
}

/**
 * The station title's ink for a state: locked stops are unlit (muted),
 * every served state reads in the full text color. The one rule both
 * LineMap and StationRow render by — a stop's NAME either reads or it
 * doesn't; the dot carries the color, the title carries only served/
 * unserved.
 */
export function stationTitleColor(colors: ColorPalette, state: StationState): string {
  return state === 'locked' ? colors.textMuted : colors.text;
}
