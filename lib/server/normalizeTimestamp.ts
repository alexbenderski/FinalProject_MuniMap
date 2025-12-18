/**
 * מקבל timestamp בשניות או במילישניות
 * מחזיר timestamp תקין במילישניות
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTimestamp(ts: any): number {
  if (!ts) return NaN;

  // number
  if (typeof ts === "number") {
    return ts < 1e12 ? ts * 1000 : ts;
  }

  // string date
  if (typeof ts === "string") {
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? NaN : parsed;
  }

  return NaN;
}