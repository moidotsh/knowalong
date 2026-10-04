// utils/number.ts
// Small numeric helpers shared across the kit.

/** Clamps `v` into [lo, hi]; an inverted range collapses to `lo`. */
export function clampNumber(v: number, lo: number, hi: number): number {
  if (hi <= lo) return lo;
  return Math.max(lo, Math.min(hi, v));
}
