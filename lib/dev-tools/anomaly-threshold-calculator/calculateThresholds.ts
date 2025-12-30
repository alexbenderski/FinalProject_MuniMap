/**
 * Anomaly Threshold Calculator - Core Logic
 * 
 * Calculates how many reports are needed to trigger each anomaly type
 * based on the existing detection algorithms.
 */

// ============================================
// Types
// ============================================

export type AnomalyType = "spike" | "slow_response" | "geo_cluster";

export interface HistoricalData {
  monthlyReportCounts: number[];  // Last 6 months of report counts
  monthlyAvgResolutionDays: number[];  // Last 6 months of avg resolution days
}

export interface ThresholdCalculation {
  anomalyType: AnomalyType;
  currentValue: number;  // Current month count or avg days
  threshold: number;     // Minimum value to trigger anomaly
  reportsNeeded: number; // How many more reports needed
  explanation: string;
  details: {
    baselineMean: number;
    baselineStd: number;
    zScoreTarget: number;
    percentageTarget: number;
    minReportsRule: number;
  };
}

// ============================================
// Statistical Utilities (from utils.ts)
// ============================================

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function std(xs: number[], m = mean(xs)): number {
  if (!xs.length) return 0;
  const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length;
  return Math.sqrt(v);
}

// ============================================
// Threshold Calculation Logic
// ============================================

/**
 * Calculate dynamic threshold using the same logic as calcDynamicThreshold
 * from utils.ts
 */
function calcDynamicThreshold(historicalValues: number[]): {
  threshold: number;
  baselineMean: number;
  baselineStd: number;
  mode: string;
} {
  if (historicalValues.length < 2) {
    return { threshold: Infinity, baselineMean: 0, baselineStd: 0, mode: "cold" };
  }

  const baseSum = historicalValues.reduce((a, b) => a + b, 0);
  if (baseSum < 10) {
    return { threshold: 8, baselineMean: 0, baselineStd: 0, mode: "static" };
  }

  const μ = mean(historicalValues);
  const σ = std(historicalValues, μ);
  
  // Constants from utils.ts
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

/**
 * Calculate SPIKE anomaly threshold (detectHighActivity)
 * Triggers when current month report count exceeds dynamic threshold
 */
export function calculateSpikeThreshold(data: HistoricalData): ThresholdCalculation {
  const historicalCounts = data.monthlyReportCounts.slice(0, -1);
  const currentCount = data.monthlyReportCounts[data.monthlyReportCounts.length - 1];

  const { threshold, baselineMean, baselineStd, mode } = calcDynamicThreshold(historicalCounts);

  const reportsNeeded = Math.max(0, Math.ceil(threshold - currentCount));
  
  const μ = baselineMean;
  const σ = baselineStd || 1;
  const targetZScore = (threshold - μ) / σ;
  const targetPercentage = μ ? ((threshold - μ) / μ) * 100 : 100;

  let explanation = "";
  if (mode === "cold") {
    explanation = "Not enough historical data (need at least 2 months).";
  } else if (mode === "static") {
    explanation = `Low baseline activity (total=${historicalCounts.reduce((a, b) => a + b, 0)}). Static threshold of 8 reports applies.`;
  } else {
    explanation = `Based on ${historicalCounts.length} months of data:\n` +
      `• Baseline mean: ${μ.toFixed(1)} reports/month\n` +
      `• Baseline std: ${σ.toFixed(1)}\n` +
      `• Current month: ${currentCount} reports\n` +
      `• Need: ${Math.ceil(threshold)} reports to trigger (${reportsNeeded} more)\n\n` +
      `Threshold is max of:\n` +
      `  - μ + 2σ = ${(μ + 2 * σ).toFixed(1)}\n` +
      `  - μ × 1.3 = ${(μ * 1.3).toFixed(1)} (30% increase)\n` +
      `  - μ + 5 = ${(μ + 5).toFixed(1)} (min 5 more)\n` +
      `  - Hard minimum = 7`;
  }

  return {
    anomalyType: "spike",
    currentValue: currentCount,
    threshold: Math.ceil(threshold),
    reportsNeeded,
    explanation,
    details: {
      baselineMean: μ,
      baselineStd: σ,
      zScoreTarget: targetZScore,
      percentageTarget: targetPercentage,
      minReportsRule: 7,
    },
  };
}

/**
 * Calculate SLOW RESPONSE anomaly threshold (detectSlowResolution)
 * Triggers when average resolution time exceeds dynamic threshold
 */
export function calculateSlowResponseThreshold(data: HistoricalData): ThresholdCalculation {
  const historicalAvgs = data.monthlyAvgResolutionDays.slice(0, -1).filter(v => v > 0);
  const currentAvg = data.monthlyAvgResolutionDays[data.monthlyAvgResolutionDays.length - 1];

  if (historicalAvgs.length < 2) {
    return {
      anomalyType: "slow_response",
      currentValue: currentAvg,
      threshold: Infinity,
      reportsNeeded: 0,
      explanation: "Not enough historical data (need at least 2 months with resolved reports).",
      details: {
        baselineMean: 0,
        baselineStd: 0,
        zScoreTarget: 0,
        percentageTarget: 0,
        minReportsRule: 0,
      },
    };
  }

  if (currentAvg === 0) {
    return {
      anomalyType: "slow_response",
      currentValue: 0,
      threshold: Infinity,
      reportsNeeded: 0,
      explanation: "No resolved reports this month. Cannot calculate threshold.",
      details: {
        baselineMean: mean(historicalAvgs),
        baselineStd: std(historicalAvgs),
        zScoreTarget: 0,
        percentageTarget: 0,
        minReportsRule: 0,
      },
    };
  }

  const { threshold, baselineMean, baselineStd } = calcDynamicThreshold(historicalAvgs);

  const μ = baselineMean;
  const σ = baselineStd || 1;
  const targetZScore = (threshold - μ) / σ;
  const targetPercentage = μ ? ((threshold - μ) / μ) * 100 : 100;

  const isAnomaly = currentAvg >= threshold;
  const explanation = `Based on ${historicalAvgs.length} months of data:\n` +
    `• Baseline mean resolution time: ${μ.toFixed(1)} days\n` +
    `• Baseline std: ${σ.toFixed(1)} days\n` +
    `• Current month avg: ${currentAvg.toFixed(1)} days\n` +
    `• Threshold: ${threshold.toFixed(1)} days\n\n` +
    `${isAnomaly 
      ? `✅ ANOMALY TRIGGERED! Current avg (${currentAvg.toFixed(1)}) exceeds threshold (${threshold.toFixed(1)}).`
      : `❌ No anomaly. Current avg (${currentAvg.toFixed(1)}) below threshold (${threshold.toFixed(1)}).`
    }\n\n` +
    `Note: This anomaly depends on resolution times, not report count.\n` +
    `To trigger: reports need to take ${Math.ceil(threshold)} days on average to resolve.`;

  return {
    anomalyType: "slow_response",
    currentValue: currentAvg,
    threshold: threshold,
    reportsNeeded: 0, // N/A for slow response (time-based, not count-based)
    explanation,
    details: {
      baselineMean: μ,
      baselineStd: σ,
      zScoreTarget: targetZScore,
      percentageTarget: targetPercentage,
      minReportsRule: 0,
    },
  };
}

/**
 * Calculate GEO CLUSTER anomaly threshold (detectSpatialClusters)
 * Requires minimum 5 reports in a ~300m x 300m grid cell
 */
export function calculateGeoClusterThreshold(data: HistoricalData): ThresholdCalculation {
  const MIN_REPORTS_FOR_ANOMALY = 5;
  const CELL_SIZE_METERS = 300;
  
  // For geo clusters, we need to estimate reports in a single cell
  // This is a simplified calculation - actual detection is more complex
  const currentMonthTotal = data.monthlyReportCounts[data.monthlyReportCounts.length - 1];
  
  const explanation = `Geographic clustering detection:\n\n` +
    `• Grid cell size: ~${CELL_SIZE_METERS}m × ${CELL_SIZE_METERS}m\n` +
    `• Minimum reports per cell: ${MIN_REPORTS_FOR_ANOMALY}\n` +
    `• Current month total reports: ${currentMonthTotal}\n\n` +
    `To trigger a geo cluster anomaly:\n` +
    `1. Need at least ${MIN_REPORTS_FOR_ANOMALY} reports within a single ${CELL_SIZE_METERS}m × ${CELL_SIZE_METERS}m grid cell\n` +
    `2. Cell must show significant increase vs its own history\n` +
    `3. At least 15% of neighboring cells must also show elevated activity\n\n` +
    `This depends on geographic distribution, not just total count.\n` +
    `To test: generate ${MIN_REPORTS_FOR_ANOMALY}+ reports with same lat/lng or very close coordinates.`;

  return {
    anomalyType: "geo_cluster",
    currentValue: currentMonthTotal,
    threshold: MIN_REPORTS_FOR_ANOMALY,
    reportsNeeded: Math.max(0, MIN_REPORTS_FOR_ANOMALY - currentMonthTotal),
    explanation,
    details: {
      baselineMean: 0,
      baselineStd: 0,
      zScoreTarget: 0,
      percentageTarget: 0,
      minReportsRule: MIN_REPORTS_FOR_ANOMALY,
    },
  };
}

/**
 * Main calculation function - calculates all thresholds
 */
export function calculateAllThresholds(data: HistoricalData): ThresholdCalculation[] {
  return [
    calculateSpikeThreshold(data),
    calculateSlowResponseThreshold(data),
    calculateGeoClusterThreshold(data),
  ];
}
