/**
 * Anomaly Threshold Calculator - Module Entry Point
 * 
 * QA tool for calculating anomaly detection thresholds.
 * 
 * === REMOVAL INSTRUCTIONS ===
 * To remove this feature:
 * 1. Delete /lib/dev-tools/anomaly-threshold-calculator folder
 * 2. Remove the import and button from dashboard/page.tsx
 * ===========================
 */

export { default as AnomalyThresholdCalculatorModal } from "./AnomalyThresholdCalculatorModal";
export {
  calculateSpikeThreshold,
  calculateSlowResponseThreshold,
  calculateGeoClusterThreshold,
  calcDynamicThreshold,
  type HistoricalData,
  type ThresholdCalculation,
  type AnomalyType,
  type ThresholdResult,
} from "./calculateThresholds";
