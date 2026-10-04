import { describe, it, expect } from 'vitest';
import { theme } from '../constants';

describe('theme', () => {
  it('exports both light and dark palettes', () => {
    expect(theme.colors.light).toBeDefined();
    expect(theme.colors.dark).toBeDefined();
  });

  it('has matching structural keys between light and dark', () => {
    const lightKeys = Object.keys(theme.colors.light).sort();
    const darkKeys = Object.keys(theme.colors.dark).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it('uses Night Metro amber as the light-mode brand (fill amber)', () => {
    expect(theme.colors.light.brand).toBe('#B8790A');
    expect(theme.colors.light.brandText).toBe('#8F5D00');
  });

  it('uses Night Metro filament amber as the dark-mode brand', () => {
    expect(theme.colors.dark.brand).toBe('#FFB020');
    expect(theme.colors.dark.brandText).toBe('#FFB020');
  });

  it('ships the Night Metro type families', () => {
    expect(theme.fonts.display).toBe('Unbounded');
    expect(theme.fonts.body).toBe('Golos Text');
    expect(theme.fonts.mono).toBe('PT Mono');
  });

  it('exports typography tokens', () => {
    expect(theme.typography.mobileTitle.fontSize).toBe(22);
    expect(theme.typography.mobileAction.fontWeight).toBe('600');
  });
});
