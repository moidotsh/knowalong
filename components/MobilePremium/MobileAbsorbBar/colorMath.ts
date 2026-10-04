// components/MobilePremium/MobileAbsorbBar/colorMath.ts
// Pure colour math for the absorb system — no React, no DOM. Golden-tested
// from __tests__/components/MobileAbsorbBar.test.tsx.

/**
 * Perceived luminance of a #rrggbb colour (0..255). Falls back to "light"
 * for unparseable input so an odd colour never flips chrome to ink-on-ink.
 */
export function yiq(color: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (m == null) return 255;
  const n = parseInt(m[1], 16);
  return ((n >> 16) * 299 + ((n >> 8) & 0xff) * 587 + (n & 0xff) * 114) / 1000;
}

/**
 * Flattens a translucent surface wash over the page colour — stations
 * whose real fill is an alpha tint (the announcement strip's brandMuted)
 * register the colour they actually read on screen.
 */
export function compositeWash(wash: string, over: string): string {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(wash);
  const h = /^#([0-9a-f]{6})$/i.exec(over.trim());
  if (m == null || h == null) return over;
  const a = m[4] != null ? Math.min(1, Math.max(0, parseFloat(m[4]))) : 1;
  const base = parseInt(h[1], 16);
  const mix = (w: number, o: number) => Math.round(w * a + o * (1 - a));
  const r = mix(parseInt(m[1], 10), (base >> 16) & 0xff);
  const g = mix(parseInt(m[2], 10), (base >> 8) & 0xff);
  const b = mix(parseInt(m[3], 10), base & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * The colour a dimmed surface reads: `color` at `alpha` composited over
 * the page — a card stepped back with RN opacity (closed drops) still
 * absorbs as the grey it actually is, not its raw token.
 */
export function dimmedOver(color: string, alpha: number, over: string): string {
  const c = /^#([0-9a-f]{6})$/i.exec(color.trim());
  const o = /^#([0-9a-f]{6})$/i.exec(over.trim());
  if (c == null || o == null) return color;
  const a = Math.min(1, Math.max(0, alpha));
  const cn = parseInt(c[1], 16);
  const on = parseInt(o[1], 16);
  const mix = (x: number, y: number) => Math.round(x * a + y * (1 - a));
  const r = mix((cn >> 16) & 0xff, (on >> 16) & 0xff);
  const g = mix((cn >> 8) & 0xff, (on >> 8) & 0xff);
  const b = mix(cn & 0xff, on & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
