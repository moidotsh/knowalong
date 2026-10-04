// __tests__/knowalong/nightMetro.test.ts
//
// The Night Metro station mapping — pure functions over the live palettes:
//   - stationColor: the four service states map to the timetable's colors
//     (known → success green, seen → the brand amber, new → signal red,
//     locked → unlit muted), in BOTH schemes
//   - stationTitleColor: only locked stops mute their title ink
//   - STATION_STATES: the service-order legend

import { describe, it, expect } from 'vitest';
import { theme } from '../../constants';
import {
  stationColor,
  stationTitleColor,
  STATION_STATES,
} from '../../components/knowalong/nightMetro';

describe('stationColor', () => {
  it('maps the four service states (dark — the night service)', () => {
    const c = theme.colors.dark;
    expect(stationColor(c, 'known')).toBe(c.status.success);
    expect(stationColor(c, 'seen')).toBe(c.brand);
    expect(stationColor(c, 'new')).toBe(c.status.error);
    expect(stationColor(c, 'locked')).toBe(c.textMuted);
  });

  it('maps the four service states (light — the daytime timetable)', () => {
    const c = theme.colors.light;
    expect(stationColor(c, 'known')).toBe(c.status.success);
    expect(stationColor(c, 'seen')).toBe(c.brand);
    expect(stationColor(c, 'new')).toBe(c.status.error);
    expect(stationColor(c, 'locked')).toBe(c.textMuted);
  });

  it('does not collide: served states are distinct from each other', () => {
    const c = theme.colors.dark;
    const colors = STATION_STATES.map((s) => stationColor(c, s));
    expect(new Set(colors).size).toBe(STATION_STATES.length);
  });
});

describe('stationTitleColor', () => {
  it('mutes only locked stops', () => {
    const c = theme.colors.dark;
    expect(stationTitleColor(c, 'locked')).toBe(c.textMuted);
    expect(stationTitleColor(c, 'known')).toBe(c.text);
    expect(stationTitleColor(c, 'seen')).toBe(c.text);
    expect(stationTitleColor(c, 'new')).toBe(c.text);
  });

  it('holds in the light timetable', () => {
    const c = theme.colors.light;
    expect(stationTitleColor(c, 'locked')).toBe(c.textMuted);
    expect(stationTitleColor(c, 'known')).toBe(c.text);
  });
});

describe('STATION_STATES', () => {
  it('lists the states in service order', () => {
    expect(STATION_STATES).toEqual(['known', 'seen', 'new', 'locked']);
  });
});
