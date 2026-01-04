//math, binning, grouping helpers

export interface Bin {
  ts: number;
  count: number;
}

export const MS_DAY = 24 * 60 * 60 * 1000;
export const MS_MONTH = 30 * MS_DAY;

// average of an array of numbers
export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

//standard deviation of an array of numbers with optional precomputed mean
//STD formula:  σ = sqrt(  Σᵢ (xᵢ - μ)²  / N  )
//when xᵢ is each number in the array, μ is the mean, N is the count of numbers
export function std(xs: number[], m = mean(xs)): number {
  if (!xs.length) return 0;
  const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length;
  return Math.sqrt(v);
}
// group array items by a key function, returning a Map from key to array of items
// keyFn: function that takes an item and returns a string key
//key is the
export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();// create empty map with string keys and array of T values
  for (const item of arr) {
    const key = keyFn(item);// get the key string for this item 
    if (!map.has(key)) map.set(key, []);// initialize array if key not present 
    map.get(key)!.push(item);// ! means non-null assertion
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


/*
 dynamic-threshold detection method that combines statistical deviation,
percentage increase, and a minimum-change rule to reduce false positives and handle sparse or noisy municipal data.
*/
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
  
  if (baseSum < 10) {
    // DYNAMIC static mode: use historical mean * 1.3, with a minimum of 1.2
    const μ = mean(hist.filter(v => v > 0)); // Mean of non-zero values
    const dynamicThreshold = μ > 0 ? Math.max(μ * 1.3, 1.2) : 8;
    return { threshold: dynamicThreshold, baselineMean: μ, baselineStd: 0, mode: "static" };
  }

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
