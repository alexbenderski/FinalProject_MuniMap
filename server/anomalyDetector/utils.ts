//math, binning, grouping helpers

export interface Bin {
  ts: number;
  count: number;
}

export const MS_DAY = 24 * 60 * 60 * 1000;
export const MS_MONTH = 30 * MS_DAY;

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function std(xs: number[], m = mean(xs)): number {
  if (!xs.length) return 0;
  const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length;
  return Math.sqrt(v);
}

export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

export function buildMonthlyBins<T>(
  reports: T[],
  getTs: (item: T) => number,
  monthsBack: number,
  now: number
) {
  const results: { ts: number; count: number }[] = [];

  // תחילת חודש נוכחי לפי אזור זמן ישראל
  const nowDate = new Date(now);
  const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();

  // בניית חודשי עבר
  for (let i = monthsBack - 1; i >= 0; i--) {
    const from = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1).getTime();
    const to = new Date(nowDate.getFullYear(), nowDate.getMonth() - i + 1, 1).getTime();

    const count = reports.filter(r => {
      const ts = getTs(r);
      return ts >= from && ts < to;
    }).length;

    results.push({ ts: from, count });
  }

  return results;
}

export function calcDynamicThreshold(bins: Bin[]): {
  threshold: number;
  baselineMean: number;
  baselineStd: number;
  mode: string;
} {
  if (bins.length < 2)
    return { threshold: Infinity, baselineMean: 0, baselineStd: 0, mode: "cold" };

  const hist = bins.slice(0, -1).map(b => b.count);
  const baseSum = hist.reduce((a, b) => a + b, 0);
  if (baseSum < 10)
    return { threshold: 8, baselineMean: 0, baselineStd: 0, mode: "static" };

  const μ = mean(hist);
  const σ = std(hist, μ);
  const Z_K = 2.0;
  const P_MIN = 0.3;
  const C_MIN = 5;
  const CURRENT_MIN = 7;

  const t1 = μ + Z_K * (σ || 1);
  const t2 = μ * (1 + P_MIN);
  const t3 = μ + C_MIN;
  const threshold = Math.max(t1, t2, t3, CURRENT_MIN);

  return { threshold, baselineMean: μ, baselineStd: σ, mode: "adaptive" };
}
