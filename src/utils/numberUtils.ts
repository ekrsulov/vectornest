/**
 * Number formatting helpers shared across geometry/path operations.
 * Uses multiplication + rounding to avoid string allocation (toFixed creates
 * an intermediate string on every call, causing GC pressure in hot paths).
 */
export function formatToPrecision(num: number, precision: number = 2): number {
  const factor = 10 ** precision;
  return Math.round(num * factor) / factor;
}
