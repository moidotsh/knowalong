import { describe, it, expect } from 'vitest';
import {
  computeContainerVariant,
  DEFAULT_VARIANT_THRESHOLDS,
  VARIANT_PRESETS,
} from '../../hooks/useContainerVariant';

// `computeContainerVariant` is the pure-function half of the
// `useContainerVariant` hook. The hook half runs a container query
// (DOM-measuring) so it's covered by component tests; here we just
// exercise the threshold math.

describe('computeContainerVariant', () => {
  describe('default thresholds', () => {
    // Defaults: compactAspectRatio: 3, compactHeight: 40,
    //          fullAspectRatio: 1.5, fullHeight: 80.

    it('returns "medium" when width and height are zero or negative', () => {
      expect(computeContainerVariant(0, 0)).toBe('medium');
      expect(computeContainerVariant(-10, 100)).toBe('medium');
      expect(computeContainerVariant(100, -10)).toBe('medium');
    });

    it('returns "compact" for wide-and-short aspect ratios', () => {
      // aspectRatio = 300/30 = 10, way above compactAspectRatio=3.
      expect(computeContainerVariant(300, 30)).toBe('compact');
    });

    it('returns "compact" when height is below compactHeight', () => {
      // aspectRatio = 200/35 ≈ 5.7 (>3 anyway) but the height check
      // fires first; explicit narrow case.
      expect(computeContainerVariant(100, 30)).toBe('compact');
    });

    it('returns "full" for tall-and-narrow aspect ratios', () => {
      // aspectRatio = 50/200 = 0.25, below fullAspectRatio=1.5.
      expect(computeContainerVariant(50, 200)).toBe('full');
    });

    it('returns "full" when height exceeds fullHeight', () => {
      // aspectRatio = 100/200 = 0.5; height 200 > fullHeight 80.
      expect(computeContainerVariant(100, 200)).toBe('full');
    });

    it('returns "medium" for balanced aspect ratios', () => {
      // aspectRatio = 100/60 ≈ 1.67 — between 1.5 and 3; height 60 —
      // between 40 and 80. Falls into the medium band.
      expect(computeContainerVariant(100, 60)).toBe('medium');
    });
  });

  describe('custom thresholds', () => {
    it('respects a custom thresholds config', () => {
      const custom = {
        compactAspectRatio: 4,
        compactHeight: 30,
        fullAspectRatio: 1.2,
        fullHeight: 100,
      };
      // aspectRatio = 200/45 ≈ 4.4 > 4 → compact.
      expect(computeContainerVariant(200, 45, custom)).toBe('compact');
      // aspectRatio = 50/120 ≈ 0.42 < 1.2 → full.
      expect(computeContainerVariant(50, 120, custom)).toBe('full');
    });
  });

  describe('VARIANT_PRESETS', () => {
    it('exports default, compact, and card presets', () => {
      expect(VARIANT_PRESETS.default).toBeDefined();
      expect(VARIANT_PRESETS.compact).toBeDefined();
      expect(VARIANT_PRESETS.card).toBeDefined();
    });

    it('each preset has thresholds and heights', () => {
      for (const key of Object.keys(VARIANT_PRESETS) as Array<keyof typeof VARIANT_PRESETS>) {
        const preset = VARIANT_PRESETS[key];
        expect(preset.thresholds).toBeDefined();
        expect(preset.heights).toBeDefined();
        expect(preset.heights.compact).toBeLessThan(preset.heights.full);
      }
    });

    it('DEFAULT_VARIANT_THRESHOLDS matches the default preset', () => {
      expect(VARIANT_PRESETS.default.thresholds).toEqual(DEFAULT_VARIANT_THRESHOLDS);
    });
  });
});
