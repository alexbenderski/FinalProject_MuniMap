/**
 * Anomaly Threshold Calculator - Core Logic
 * 
 * MATCHES THE ACTUAL SERVER DETECTION ALGORITHMS EXACTLY
 * 
 * This uses the same logic as:
 * - detectHighActivity.ts (spike detection)
 * - detectSlowResolution.ts (slow response detection)
 * - detectSpatialClusters.ts (geo cluster detection)
 */

// ============================================
// Types
// ============================================

export type AnomalyType = "spike" | "slow_response" | "geo_cluster";
export type ReportType = "garbage" | "lighting" | "tree" | "hazard";

export interface Bin {
  ts: number;
  count: number;
}

export interface ThresholdResult {
  anomalyType: AnomalyType;
  reportType: ReportType;
  area: string;
  
  // Current state
  currentValue: number;
  threshold: number;
  isTriggered: boolean;
  reportsNeeded: number;
  
  // Stats
  baselineMean: number;
  baselineStd: number;
  mode: "cold" | "static" | "adaptive";
  
  // Breakdown
  bins: number[];
  explanation: string;
}

// ============================================
// EXACT COPY of calcDynamicThreshold from utils.ts
// ============================================

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function std(xs: number[], m = mean(xs)): number {
  if (!xs.length) return 0;
  const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length;
  return Math.sqrt(v);
}

/**
 * EXACT COPY of calcDynamicThreshold from lib/server/anomalyDetector/utils.ts
 */
export function calcDynamicThreshold(bins: Bin[]): {
  threshold: number;
  baselineMean: number;
  baselineStd: number;
  mode: "cold" | "static" | "adaptive";
} {
  if (bins.length < 2) {
    return { threshold: Infinity, baselineMean: 0, baselineStd: 0, mode: "cold" };
  }

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

// ============================================
// SPIKE Calculation
// ============================================

export function calculateSpikeThreshold(
  bins: Bin[],
  reportType: ReportType,
  area: string
): ThresholdResult {
  const currentCount = bins.length > 0 ? bins[bins.length - 1].count : 0;
  const { threshold, baselineMean, baselineStd, mode } = calcDynamicThreshold(bins);
  
  const isTriggered = currentCount >= threshold;
  const reportsNeeded = isTriggered ? 0 : Math.ceil(threshold - currentCount);
  
  const binCounts = bins.map(b => b.count);
  
  let explanation = "";
  if (mode === "cold") {
    explanation = "❄️ COLD START: Not enough historical data (need at least 2 months).";
  } else if (mode === "static") {
    const histSum = binCounts.slice(0, -1).reduce((a, b) => a + b, 0);
    const μ = baselineMean || mean(binCounts.slice(0, -1).filter(v => v > 0));
    const calculated = μ * 1.3;
    explanation = `📊 STATIC MODE: Low historical activity (total=${histSum}).\n` +
      `Historical mean: ${μ.toFixed(2)}\n` +
      `Dynamic threshold: max(${μ.toFixed(2)} × 1.3, 1.2) = max(${calculated.toFixed(2)}, 1.2) = ${threshold.toFixed(2)}\n` +
      `Need ${reportsNeeded} more reports this month.`;
  } else {
    const μ = baselineMean;
    const σ = baselineStd || 1;
    explanation = `📈 ADAPTIVE: μ=${μ.toFixed(1)}, σ=${σ.toFixed(1)}\n` +
      `Threshold=${Math.ceil(threshold)}, Current=${currentCount}\n` +
      (isTriggered 
        ? `✅ TRIGGERED!`
        : `❌ Need ${reportsNeeded} more reports.`);
  }

  return {
    anomalyType: "spike",
    reportType,
    area,
    currentValue: currentCount,
    threshold: mode === "cold" ? Infinity : Math.ceil(threshold),
    isTriggered,
    reportsNeeded,
    baselineMean,
    baselineStd,
    mode,
    bins: binCounts,
    explanation,
  };
}

// ============================================
// SLOW RESPONSE Calculation
// ============================================

export function calculateSlowResponseThreshold(
  avgDaysBins: Bin[],
  reportType: ReportType,
  area: string
): ThresholdResult {
  const currentAvg = avgDaysBins.length > 0 ? avgDaysBins[avgDaysBins.length - 1].count : 0;
  const historyAvgs = avgDaysBins.slice(0, -1).map(b => b.count).filter(v => v > 0);
  
  const binValues = avgDaysBins.map(b => b.count);
  
  if (historyAvgs.length < 2) {
    return {
      anomalyType: "slow_response",
      reportType,
      area,
      currentValue: currentAvg,
      threshold: Infinity,
      isTriggered: false,
      reportsNeeded: 0,
      baselineMean: 0,
      baselineStd: 0,
      mode: "cold",
      bins: binValues,
      explanation: `❄️ COLD START: Need ≥2 months with resolved reports.\n` +
        `Currently have ${historyAvgs.length} months with data.`,
    };
  }

  if (currentAvg === 0) {
    return {
      anomalyType: "slow_response",
      reportType,
      area,
      currentValue: 0,
      threshold: Infinity,
      isTriggered: false,
      reportsNeeded: 0,
      baselineMean: mean(historyAvgs),
      baselineStd: std(historyAvgs),
      mode: "cold",
      bins: binValues,
      explanation: "⚠️ NO DATA: No resolved reports this month.",
    };
  }

  // Use EXACT same logic as server: calcDynamicThreshold with avgDaysBins
  const { threshold, baselineMean, baselineStd, mode } = calcDynamicThreshold(avgDaysBins);
  
  const isTriggered = currentAvg >= threshold;
  const μ = baselineMean;
  const σ = baselineStd;
  
  let explanation = "";
  
  if (mode === "cold") {
    explanation = "❄️ COLD START: Not enough data.";
  } else if (mode === "static") {
    const histSum = historyAvgs.reduce((a, b) => a + b, 0);
    const μ = baselineMean || mean(historyAvgs.filter(v => v > 0));
    const calculated = μ * 1.3;
    explanation = `📊 STATIC MODE: Low historical sum (${histSum.toFixed(2)} < 10 days).\n` +
      `Historical mean: ${μ.toFixed(2)}d\n` +
      `Dynamic threshold: max(${μ.toFixed(2)} × 1.3, 1.2) = max(${calculated.toFixed(2)}, 1.2) = ${threshold.toFixed(2)}d\n\n` +
      `Historical months: [${historyAvgs.map(v => v.toFixed(2)).join(", ")}]\n` +
      `Current: ${currentAvg.toFixed(2)}d\n` +
      `Threshold: ${threshold.toFixed(2)}d\n\n` +
      (isTriggered
        ? `✅ TRIGGERED! ${currentAvg.toFixed(2)} ≥ ${threshold.toFixed(2)}`
        : `❌ NOT TRIGGERED. Need avg ${(threshold - currentAvg).toFixed(2)}d more.`);
  } else {
    explanation = `📈 ADAPTIVE MODE:\n` +
      `Historical months: [${historyAvgs.map(v => v.toFixed(2)).join(", ")}]\n` +
      `Mean (μ): ${μ.toFixed(2)} days\n` +
      `Std (σ): ${σ.toFixed(2)} days\n\n` +
      `Threshold = max of:\n` +
      `  • μ + 2σ = ${(μ + 2 * (σ || 1)).toFixed(2)}d\n` +
      `  • μ × 1.3 = ${(μ * 1.3).toFixed(2)}d (30% slower)\n` +
      `  • μ + 5 = ${(μ + 5).toFixed(2)}d\n` +
      `  • Hard floor = 7d\n\n` +
      `Final threshold: ${threshold.toFixed(2)}d\n` +
      `Current: ${currentAvg.toFixed(2)}d\n\n` +
      (isTriggered
        ? `✅ TRIGGERED! ${currentAvg.toFixed(2)} ≥ ${threshold.toFixed(2)}`
        : `❌ NOT TRIGGERED. Need avg ${(threshold - currentAvg).toFixed(2)}d more.`);
  }

  return {
    anomalyType: "slow_response",
    reportType,
    area,
    currentValue: currentAvg,
    threshold: mode === "cold" ? Infinity : threshold,
    isTriggered,
    reportsNeeded: 0,
    baselineMean: μ,
    baselineStd: σ,
    mode,
    bins: binValues,
    explanation,
  };
}

// ============================================
// GEO CLUSTER Calculation
// ============================================

export function calculateGeoClusterThreshold(
  reportType: ReportType,
  area: string,
  reportsInCluster: number
): ThresholdResult {
  const MIN_REPORTS = 5;
  const reportsNeeded = Math.max(0, MIN_REPORTS - reportsInCluster);

  return {
    anomalyType: "geo_cluster",
    reportType,
    area,
    currentValue: reportsInCluster,
    threshold: MIN_REPORTS,
    isTriggered: reportsInCluster >= MIN_REPORTS,
    reportsNeeded,
    baselineMean: 0,
    baselineStd: 0,
    mode: "static",
    bins: [],
    explanation: `🗺️ GEO CLUSTER: Need ${MIN_REPORTS}+ reports in ~300m area.\n` +
      `Current cluster: ${reportsInCluster} reports.\n` +
      (reportsInCluster >= MIN_REPORTS
        ? `✅ Could trigger if clustered!`
        : `❌ Need ${reportsNeeded} more in same location.`),
  };
}
