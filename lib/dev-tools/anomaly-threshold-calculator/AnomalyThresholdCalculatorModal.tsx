"use client";

/**
 * Anomaly Threshold Calculator Modal - UI Component
 * 
 * Calculates and displays how many reports are needed to trigger each anomaly type.
 * Helps testers understand the thresholds before generating test data.
 */

import React, { useState, useEffect } from "react";
import {
  calculateAllThresholds,
  type HistoricalData,
  type ThresholdCalculation,
  type AnomalyType,
} from "./calculateThresholds";

interface Props {
  open: boolean;
  onClose: () => void;
  cityName: string;
  reportType: string;
}

const ANOMALY_NAMES: Record<AnomalyType, string> = {
  spike: "High Activity Spike",
  slow_response: "Slow Response Time",
  geo_cluster: "Geographic Cluster",
};

const ANOMALY_DESCRIPTIONS: Record<AnomalyType, string> = {
  spike: "Detects unusual increase in report volume compared to historical average",
  slow_response: "Detects when reports take longer than usual to resolve",
  geo_cluster: "Detects geographic concentrations of reports in small areas",
};

export default function AnomalyThresholdCalculatorModal({
  open,
  onClose,
  cityName,
  reportType,
}: Props) {
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyType | "all">("all");
  const [historicalData, setHistoricalData] = useState<HistoricalData>({
    monthlyReportCounts: [15, 18, 20, 17, 19, 22],
    monthlyAvgResolutionDays: [5.2, 6.1, 5.8, 6.3, 5.5, 7.2],
  });
  const [calculations, setCalculations] = useState<ThresholdCalculation[]>([]);

  // Calculate on mount and when data changes
  useEffect(() => {
    if (open) {
      const results = calculateAllThresholds(historicalData);
      setCalculations(results);
    }
  }, [open, historicalData]);

  if (!open) return null;

  const handleCalculate = () => {
    const results = calculateAllThresholds(historicalData);
    setCalculations(results);
  };

  const getAnomalyColor = (type: AnomalyType): string => {
    switch (type) {
      case "spike":
        return "orange";
      case "slow_response":
        return "red";
      case "geo_cluster":
        return "purple";
    }
  };

  const formatNumber = (num: number): string => {
    if (!isFinite(num)) return "∞";
    return num.toFixed(1);
  };

  const filteredCalculations = selectedAnomaly === "all"
    ? calculations
    : calculations.filter(c => c.anomalyType === selectedAnomaly);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">🎯 Anomaly Threshold Calculator</h2>
            <p className="text-sm text-indigo-100">
              Calculate how many reports trigger anomalies • {cityName} • {reportType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-indigo-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>💡 How it works:</strong> Enter historical data for the past 6 months,
              and this tool calculates the thresholds for each anomaly type based on the actual detection algorithms.
            </p>
          </div>

          {/* Historical Data Input */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">📊 Historical Data (Last 6 Months)</h3>
            
            {/* Monthly Report Counts */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">
                Monthly Report Counts (oldest → newest)
              </label>
              <div className="grid grid-cols-6 gap-2">
                {historicalData.monthlyReportCounts.map((count, i) => (
                  <input
                    key={`count-${i}`}
                    type="number"
                    value={count}
                    onChange={(e) => {
                      const newCounts = [...historicalData.monthlyReportCounts];
                      newCounts[i] = parseInt(e.target.value) || 0;
                      setHistoricalData({ ...historicalData, monthlyReportCounts: newCounts });
                    }}
                    className="px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 text-center"
                    placeholder={`M${i + 1}`}
                    min="0"
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Last value is current month</p>
            </div>

            {/* Monthly Avg Resolution Days */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">
                Average Resolution Days (oldest → newest)
              </label>
              <div className="grid grid-cols-6 gap-2">
                {historicalData.monthlyAvgResolutionDays.map((days, i) => (
                  <input
                    key={`days-${i}`}
                    type="number"
                    step="0.1"
                    value={days}
                    onChange={(e) => {
                      const newDays = [...historicalData.monthlyAvgResolutionDays];
                      newDays[i] = parseFloat(e.target.value) || 0;
                      setHistoricalData({ ...historicalData, monthlyAvgResolutionDays: newDays });
                    }}
                    className="px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 text-center"
                    placeholder={`M${i + 1}`}
                    min="0"
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Average days to resolve per month</p>
            </div>

            <button
              onClick={handleCalculate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm"
            >
              🔄 Recalculate Thresholds
            </button>
          </div>

          {/* Anomaly Filter */}
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-2">Filter by Anomaly Type</label>
            <select
              value={selectedAnomaly}
              onChange={(e) => setSelectedAnomaly(e.target.value as AnomalyType | "all")}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Anomalies</option>
              <option value="spike">Spike - High Activity</option>
              <option value="slow_response">Slow Response Time</option>
              <option value="geo_cluster">Geographic Cluster</option>
            </select>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {filteredCalculations.map((calc) => {
              const color = getAnomalyColor(calc.anomalyType);
              return (
                <div
                  key={calc.anomalyType}
                  className={`border-2 border-${color}-200 rounded-lg overflow-hidden`}
                >
                  {/* Header */}
                  <div className={`bg-${color}-50 px-4 py-3 border-b border-${color}-200`}>
                    <h4 className={`font-semibold text-${color}-800 text-lg flex items-center justify-between`}>
                      <span>{ANOMALY_NAMES[calc.anomalyType]}</span>
                      <span className={`text-sm font-normal text-${color}-600`}>
                        {calc.anomalyType}
                      </span>
                    </h4>
                    <p className={`text-xs text-${color}-600 mt-1`}>
                      {ANOMALY_DESCRIPTIONS[calc.anomalyType]}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="p-4 bg-white">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Current Value</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {formatNumber(calc.currentValue)}
                          {calc.anomalyType === "slow_response" && " days"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Threshold</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {formatNumber(calc.threshold)}
                          {calc.anomalyType === "slow_response" && " days"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Reports Needed</p>
                        <p className={`text-2xl font-bold ${calc.reportsNeeded > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {calc.reportsNeeded > 0 ? `+${calc.reportsNeeded}` : "✓ Triggered"}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {calc.currentValue >= calc.threshold ? (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 font-semibold text-sm">
                          ✅ ANOMALY ACTIVE - Current value exceeds threshold!
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-gray-700 font-semibold text-sm">
                          ❌ No anomaly - Need {calc.reportsNeeded} more to trigger
                        </p>
                      </div>
                    )}

                    {/* Statistical Details */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Statistical Details</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Baseline Mean:</span>
                          <span className="ml-2 font-medium">{formatNumber(calc.details.baselineMean)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Baseline Std:</span>
                          <span className="ml-2 font-medium">{formatNumber(calc.details.baselineStd)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Target Z-Score:</span>
                          <span className="ml-2 font-medium">{formatNumber(calc.details.zScoreTarget)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Target % Increase:</span>
                          <span className="ml-2 font-medium">{formatNumber(calc.details.percentageTarget)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Explanation</p>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {calc.explanation}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
