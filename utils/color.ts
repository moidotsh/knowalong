// utils/color.ts
// Hex colour math — the single owner of hex↔rgb parsing and hex+alpha
// composition. Theme tokens are hex strings; translucent derivatives
// (`${hex}40`-style suffixes) should route through `withAlpha` so the
// parsing lives once.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parses a #rrggbb hex string; null for anything else. */
export function hexToRgb(hex: string): Rgb | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (m == null) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/**
 * Appends a two-digit hex alpha to a #rrggbb colour: withAlpha('#FFB020', 0.25)
 * → '#FFB02040'. Alpha rounds to the nearest 1/255. Non-hex input returns
 * the input unchanged (callers fall back to their own tint strategy).
 */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  if (/^#[0-9a-f]{6}$/i.test(hex.trim())) {
    return `${hex.trim()}${a.toString(16).padStart(2, '0')}`;
  }
  return hex;
}

/**
 * Returns an alpha-applier for a hex colour: `rgbaOf('#FFB020')(0.25)` →
 * the rgba() string. Channels fall back to 0 for unparseable input.
 */
export function rgbaOf(hex: string): (alpha: number) => string {
  const { r, g, b } = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  return (alpha: number) => `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}
