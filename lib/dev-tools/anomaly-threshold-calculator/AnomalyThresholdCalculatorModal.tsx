"use client";

/**
 * Anomaly Threshold Calculator Modal
 * 
 * Shows exactly how many reports you need to trigger each anomaly type
 * for the selected city and report type.
 * 
 * Uses the EXACT SAME LOGIC as the server detection algorithms.
 */

import React, { useState, useEffect } from "react";
import {
  calculateSpikeThreshold,
  calculateSlowResponseThreshold,
  calculateGeoClusterThreshold,
  type Bin,
  type ThresholdResult,
  type ReportType,
  type AnomalyType,
} from "./calculateThresholds";
import { subscribeToReports } from "@/lib/client/fetchers";
import { generateReports, GeneratorConfig } from "@/lib/dev-tools/report-generator/generateReports";
import { writeReportsToFirebase } from "@/lib/dev-tools/report-generator/writeReportsToFirebase";
import type { Report } from "@/lib/types";
import type { Category } from "@/lib/categories";

interface Props {
  open: boolean;
  onClose: () => void;
  cityName: string;
  reportType: string;
  cityBoundary?: { lat: number; lng: number }[];
  defaultCenter?: { lat: number; lng: number };
}

interface ClusterConfig {
  lat: number;
  lng: number;
  count: number;
  radius: number;
}

const REPORT_TYPES: ReportType[] = ["garbage", "lighting", "tree", "hazard"];

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  garbage: "🗑️ Garbage",
  lighting: "💡 Lighting",
  tree: "🌳 Tree",
  hazard: "⚠️ Hazard",
};

const ANOMALY_LABELS: Record<AnomalyType, string> = {
  spike: "📈 High Activity Spike",
  slow_response: "🐌 Slow Response Time",
  geo_cluster: "🗺️ Geographic Cluster",
};

export default function AnomalyThresholdCalculatorModal({
  open,
  onClose,
  cityName,
  reportType: initialReportType,
  cityBoundary = [],
  defaultCenter,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ReportType>(
    (initialReportType as ReportType) || "garbage"
  );
  const [results, setResults] = useState<ThresholdResult[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  
  // Trigger state
  const [triggering, setTriggering] = useState<AnomalyType | null>(null);
  const [triggerResult, setTriggerResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Geo cluster configuration
  const [clusterConfigs, setClusterConfigs] = useState<ClusterConfig[]>([
    { lat: defaultCenter?.lat || 32.0853, lng: defaultCenter?.lng || 34.7818, count: 5, radius: 150 }
  ]);
  
  // Slow response configuration (days to resolve)
  const [slowResolveDays, setSlowResolveDays] = useState(3);
  
  // Cold start: which past month to populate (1 = last month, 2 = 2 months ago, etc.)
  const [coldStartPastMonth, setColdStartPastMonth] = useState(2);

  // Update cluster configs when defaultCenter changes
  useEffect(() => {
    if (defaultCenter) {
      setClusterConfigs([{ 
        lat: defaultCenter.lat ?? 32.0853, 
        lng: defaultCenter.lng ?? 34.7818, 
        count: 5, 
        radius: 150 
      }]);
    }
  }, [defaultCenter]);

  // Subscribe to reports
  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setTriggerResult(null);
    const unsubscribe = subscribeToReports((data) => {
      const reports: Report[] = [];
      Object.entries(data).forEach(([type, group]) => {
        Object.entries(group).forEach(([id, report]) => {
          reports.push({ ...report, type, id });
        });
      });
      setAllReports(reports);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [open]);

  // ========================================
  // TRIGGER FUNCTIONS
  // ========================================
  
  const handleTriggerSpike = async (reportsNeeded: number) => {
    if (reportsNeeded <= 0 || cityBoundary.length < 3) return;
    
    setTriggering("spike");
    setTriggerResult(null);
    
    try {
      const now = Date.now();
      const monthStart = getMonthStart(now, 0);
      
      // Create reports in the current month
      const config: GeneratorConfig = {
        endStatus: "open",
        reportType: selectedType as Category,
        clusterCenter: defaultCenter || { lat: 32.0853, lng: 34.7818 },
        radiusMeters: 2000, // Spread reports across city
        count: reportsNeeded,
        cityBoundary,
        area: cityName,
        openTimeRange: {
          start: monthStart,
          end: now - 60000, // 1 minute ago
        },
      };
      
      const { reports, errors } = generateReports(config);
      
      if (errors.length > 0) {
        setTriggerResult({ success: false, message: `Generation errors: ${errors.join(", ")}` });
        return;
      }
      
      const writeResult = await writeReportsToFirebase(reports);
      
      if (writeResult.success) {
        setTriggerResult({ success: true, message: `✅ Added ${writeResult.writtenCount} reports to trigger spike!` });
      } else {
        setTriggerResult({ success: false, message: `Failed: ${writeResult.errors.join(", ")}` });
      }
    } catch (error) {
      setTriggerResult({ success: false, message: `Error: ${error}` });
    } finally {
      setTriggering(null);
    }
  };
  
  const handleTriggerSlowResponse = async (isColdStart: boolean = false, customCount?: number, targetMonthOffset: number = 0) => {
    if (cityBoundary.length < 3) return;
    
    setTriggering("slow_response");
    setTriggerResult(null);
    
    try {
      const now = Date.now();
      const daysInMs = slowResolveDays * 24 * 60 * 60 * 1000;
      let totalWritten = 0;
      const allErrors: string[] = [];
      
      if (isColdStart) {
        // Cold start: Add reports to BOTH current month AND a past month
        const monthsToPopulate = [0, coldStartPastMonth]; // Current and selected past month
        
        for (const monthOffset of monthsToPopulate) {
          const monthStart = getMonthStart(now, monthOffset);
          const monthEnd = monthOffset === 0 ? now - 60000 : getMonthStart(now, monthOffset - 1);
          
          const config: GeneratorConfig = {
            endStatus: "resolved",
            reportType: selectedType as Category,
            clusterCenter: defaultCenter || { lat: 32.0853, lng: 34.7818 },
            radiusMeters: 2000,
            count: 3, // Add 3 reports per month
            cityBoundary,
            area: cityName,
            openTimeRange: {
              start: monthStart,
              end: monthStart + 60000,
            },
            pendingTimeRange: {
              start: monthStart + 60000,
              end: monthStart + daysInMs * 0.3,
            },
            inProgressTimeRange: {
              start: monthStart + daysInMs * 0.3,
              end: monthStart + daysInMs * 0.6,
            },
            resolvedTimeRange: {
              start: monthStart + daysInMs * 0.9,
              end: Math.min(monthStart + daysInMs, monthEnd),
            },
          };
          
          const { reports, errors } = generateReports(config);
          
          if (errors.length > 0) {
            allErrors.push(...errors);
            continue;
          }
          
          const writeResult = await writeReportsToFirebase(reports);
          totalWritten += writeResult.writtenCount;
          
          if (writeResult.errors.length > 0) {
            allErrors.push(...writeResult.errors);
          }
        }
        
        if (totalWritten > 0) {
          setTriggerResult({ 
            success: true, 
            message: `✅ Added ${totalWritten} resolved reports across 2 months to exit cold start!` 
          });
        } else {
          setTriggerResult({ success: false, message: `Failed: ${allErrors.join(", ")}` });
        }
      } else {
        // Normal case: Add to target month (current or past)
        const monthStart = getMonthStart(now, targetMonthOffset);
        const monthEnd = targetMonthOffset === 0 ? now - 60000 : getMonthStart(now, targetMonthOffset - 1);
        const reportsToAdd = customCount || 5; // Use custom count or default 5
        
        const config: GeneratorConfig = {
          endStatus: "resolved",
          reportType: selectedType as Category,
          clusterCenter: defaultCenter || { lat: 32.0853, lng: 34.7818 },
          radiusMeters: 2000,
          count: reportsToAdd,
          cityBoundary,
          area: cityName,
          openTimeRange: {
            start: monthStart,
            end: monthStart + 60000,
          },
          pendingTimeRange: {
            start: monthStart + 60000,
            end: monthStart + daysInMs * 0.3,
          },
          inProgressTimeRange: {
            start: monthStart + daysInMs * 0.3,
            end: monthStart + daysInMs * 0.6,
          },
          resolvedTimeRange: {
            start: monthStart + daysInMs * 0.9,
            end: Math.min(monthStart + daysInMs, monthEnd),
          },
        };
        
        const { reports, errors } = generateReports(config);
        
        if (errors.length > 0) {
          setTriggerResult({ success: false, message: `Generation errors: ${errors.join(", ")}` });
          return;
        }
        
        const writeResult = await writeReportsToFirebase(reports);
        
        const monthName = targetMonthOffset === 0 ? "current month" : `${targetMonthOffset} month(s) ago`;
        if (writeResult.success) {
          setTriggerResult({ 
            success: true, 
            message: `✅ Added ${writeResult.writtenCount} reports with ~${slowResolveDays}d resolution to ${monthName}!` 
          });
        } else {
          setTriggerResult({ success: false, message: `Failed: ${writeResult.errors.join(", ")}` });
        }
      }
    } catch (error) {
      setTriggerResult({ success: false, message: `Error: ${error}` });
    } finally {
      setTriggering(null);
    }
  };
  
  const handleTriggerGeoCluster = async () => {
    if (cityBoundary.length < 3) return;
    
    setTriggering("geo_cluster");
    setTriggerResult(null);
    
    try {
      const now = Date.now();
      const monthStart = getMonthStart(now, 0);
      let totalWritten = 0;
      const allErrors: string[] = [];
      
      // Generate reports for each cluster center
      for (const cluster of clusterConfigs) {
        if (cluster.count <= 0) continue;
        
        const config: GeneratorConfig = {
          endStatus: "open",
          reportType: selectedType as Category,
          clusterCenter: { lat: cluster.lat, lng: cluster.lng },
          radiusMeters: cluster.radius, // Use custom radius
          count: cluster.count,
          cityBoundary,
          area: cityName,
          openTimeRange: {
            start: monthStart,
            end: now - 60000,
          },
        };
        
        const { reports, errors } = generateReports(config);
        
        if (errors.length > 0) {
          allErrors.push(...errors);
          continue;
        }
        
        const writeResult = await writeReportsToFirebase(reports);
        totalWritten += writeResult.writtenCount;
        
        if (writeResult.errors.length > 0) {
          allErrors.push(...writeResult.errors);
        }
      }
      
      if (totalWritten > 0) {
        setTriggerResult({ 
          success: true, 
          message: `✅ Added ${totalWritten} clustered reports across ${clusterConfigs.length} location(s)!` 
        });
      } else {
        setTriggerResult({ success: false, message: `Failed: ${allErrors.join(", ")}` });
      }
    } catch (error) {
      setTriggerResult({ success: false, message: `Error: ${error}` });
    } finally {
      setTriggering(null);
    }
  };
  
  const addClusterConfig = () => {
    const lastCluster = clusterConfigs[clusterConfigs.length - 1];
    // Offset new cluster slightly
    setClusterConfigs([
      ...clusterConfigs,
      { 
        lat: lastCluster.lat + 0.005, 
        lng: lastCluster.lng + 0.005, 
        count: 5,
        radius: lastCluster.radius
      }
    ]);
  };
  
  const removeClusterConfig = (index: number) => {
    if (clusterConfigs.length <= 1) return;
    setClusterConfigs(clusterConfigs.filter((_, i) => i !== index));
  };
  
  const updateClusterConfig = (index: number, field: keyof ClusterConfig, value: number) => {
    setClusterConfigs(clusterConfigs.map((c, i) => 
      i === index ? { ...c, [field]: value } : c
    ));
  };

  // Calculate thresholds when data or selection changes
  useEffect(() => {
    if (loading || !open) return;

    const now = Date.now();
    const area = cityName;
    const type = selectedType;

    // Filter reports for this area and type
    const filtered = allReports.filter(
      (r) => r.area === area && r.type === type && !r.deleted
    );

    // Build monthly bins (same logic as detectHighActivity)
    const bins = buildMonthlyBins(filtered, 6, now);

    // Calculate spike threshold
    const spikeResult = calculateSpikeThreshold(bins, type, area);

    // Calculate slow response threshold
    const avgDaysBins = buildAvgResolutionBins(filtered, 6, now);
    const slowResult = calculateSlowResponseThreshold(avgDaysBins, type, area);

    // Calculate geo cluster threshold
    const currentMonthStart = getMonthStart(now, 0);
    const currentMonthReportsWithGeo = filtered.filter(
      (r) => r.timestamp >= currentMonthStart && r.lat && r.lng
    ).length;
    const geoResult = calculateGeoClusterThreshold(type, area, currentMonthReportsWithGeo);

    setResults([spikeResult, slowResult, geoResult]);
  }, [loading, open, allReports, cityName, selectedType]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">🎯 Anomaly Threshold Calculator</h2>
            <p className="text-sm text-indigo-100">
              City: <strong>{cityName}</strong>
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
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4 animate-pulse">⏳</div>
              <p className="text-gray-600 font-medium">Loading reports from database...</p>
            </div>
          ) : (
            <>
              {/* Report Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Report Type:
                </label>
                <div className="flex gap-2 flex-wrap">
                  {REPORT_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedType === type
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {REPORT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Summary */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>📊 Data Source:</strong> Real reports from database for{" "}
                  <strong>{cityName}</strong> / <strong>{selectedType}</strong>
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Total {selectedType} reports in this city:{" "}
                  {allReports.filter((r) => r.area === cityName && r.type === selectedType).length}
                </p>
              </div>

              {/* Trigger Result Banner */}
              {triggerResult && (
                <div className={`mb-4 p-3 rounded-lg ${
                  triggerResult.success 
                    ? "bg-green-100 border border-green-300 text-green-800" 
                    : "bg-red-100 border border-red-300 text-red-800"
                }`}>
                  {triggerResult.message}
                </div>
              )}

              {/* No City Boundary Warning */}
              {cityBoundary.length < 3 && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
                  ⚠️ City boundary not available. Trigger buttons are disabled.
                </div>
              )}

              {/* Results */}
              <div className="space-y-4">
                {results.map((result) => (
                  <AnomalyCard 
                    key={result.anomalyType} 
                    result={result}
                    triggering={triggering}
                    onTriggerSpike={handleTriggerSpike}
                    onTriggerSlowResponse={handleTriggerSlowResponse}
                    onTriggerGeoCluster={handleTriggerGeoCluster}
                    canTrigger={cityBoundary.length >= 3}
                    // Slow response config
                    slowResolveDays={slowResolveDays}
                    onSlowResolveDaysChange={setSlowResolveDays}
                    // Cold start config
                    coldStartPastMonth={coldStartPastMonth}
                    onColdStartPastMonthChange={setColdStartPastMonth}
                    // Geo cluster config
                    clusterConfigs={clusterConfigs}
                    onAddCluster={addClusterConfig}
                    onRemoveCluster={removeClusterConfig}
                    onUpdateCluster={updateClusterConfig}
                  />
                ))}
              </div>

              {/* How to Trigger Guide */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-bold text-yellow-800 mb-2">💡 How to Trigger Anomalies</h3>
                <ul className="text-sm text-yellow-700 space-y-2">
                  <li>
                    <strong>Spike:</strong> Add reports until current month count ≥ threshold
                  </li>
                  <li>
                    <strong>Slow Response:</strong> Create reports and resolve them after many days
                  </li>
                  <li>
                    <strong>Geo Cluster:</strong> Add 5+ reports with same/similar lat/lng (~300m)
                  </li>
                </ul>
              </div>
            </>
          )}
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

// ============================================
// Anomaly Card Component
// ============================================

interface AnomalyCardProps {
  result: ThresholdResult;
  triggering: AnomalyType | null;
  onTriggerSpike: (count: number) => void;
  onTriggerSlowResponse: (isColdStart?: boolean, customCount?: number, targetMonthOffset?: number) => void;
  onTriggerGeoCluster: () => void;
  canTrigger: boolean;
  // Slow response config
  slowResolveDays: number;
  onSlowResolveDaysChange: (days: number) => void;
  // Cold start config
  coldStartPastMonth: number;
  onColdStartPastMonthChange: (month: number) => void;
  // Geo cluster config
  clusterConfigs: ClusterConfig[];
  onAddCluster: () => void;
  onRemoveCluster: (index: number) => void;
  onUpdateCluster: (index: number, field: keyof ClusterConfig, value: number) => void;
}

function AnomalyCard({ 
  result, 
  triggering, 
  onTriggerSpike, 
  onTriggerSlowResponse,
  onTriggerGeoCluster,
  canTrigger,
  slowResolveDays,
  onSlowResolveDaysChange,
  coldStartPastMonth,
  onColdStartPastMonthChange,
  clusterConfigs,
  onAddCluster,
  onRemoveCluster,
  onUpdateCluster,
}: AnomalyCardProps) {
  const getBgColor = () => {
    if (result.isTriggered) return "bg-green-50 border-green-300";
    if (result.mode === "cold") return "bg-gray-50 border-gray-300";
    return "bg-orange-50 border-orange-300";
  };

  const getStatusBadge = () => {
    if (result.isTriggered) {
      return <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">TRIGGERED</span>;
    }
    if (result.mode === "cold") {
      return <span className="px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded">NO DATA</span>;
    }
    return <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">NOT TRIGGERED</span>;
  };
  
  const isLoading = triggering === result.anomalyType;

  return (
    <div className={`p-4 rounded-lg border-2 ${getBgColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800">
          {ANOMALY_LABELS[result.anomalyType]}
        </h3>
        {getStatusBadge()}
      </div>

      {/* Key Numbers */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="text-center p-2 bg-white rounded border">
          <p className="text-xs text-gray-500 uppercase">Current</p>
          <p className="text-xl font-bold text-gray-800">
            {result.anomalyType === "slow_response"
              ? `${result.currentValue.toFixed(1)}d`
              : result.currentValue}
          </p>
        </div>
        <div className="text-center p-2 bg-white rounded border">
          <p className="text-xs text-gray-500 uppercase">Threshold</p>
          <p className="text-xl font-bold text-gray-800">
            {result.threshold === Infinity
              ? "∞"
              : result.anomalyType === "slow_response"
              ? `${result.threshold.toFixed(1)}d`
              : Math.ceil(result.threshold)}
          </p>
        </div>
        <div className="text-center p-2 bg-white rounded border">
          <p className="text-xs text-gray-500 uppercase">Need</p>
          <p className={`text-xl font-bold ${result.reportsNeeded > 0 ? "text-red-600" : "text-green-600"}`}>
            {result.anomalyType === "slow_response"
              ? "N/A"
              : result.reportsNeeded > 0
              ? `+${result.reportsNeeded}`
              : "✓"}
          </p>
        </div>
      </div>

      {/* Historical Bins */}
      {result.bins.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Monthly bins (oldest → newest):</p>
          <div className="flex gap-1">
            {result.bins.map((count, i) => (
              <div
                key={i}
                className={`flex-1 text-center py-1 text-xs font-mono rounded ${
                  i === result.bins.length - 1
                    ? "bg-indigo-100 text-indigo-800 font-bold"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {result.anomalyType === "slow_response" ? count.toFixed(1) : count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans bg-white p-2 rounded border mb-3">
        {result.explanation}
      </pre>
      
      {/* ===== TRIGGER SECTION ===== */}
      
      {/* SLOW RESPONSE COLD START - Show even in cold mode */}
      {result.anomalyType === "slow_response" && result.mode === "cold" && (
        <div className="border-t pt-3 mt-3">
          <p className="text-sm text-gray-600 mb-2 font-semibold">❄️ Bootstrap Cold Start:</p>
          <p className="text-xs text-gray-500 mb-3">
            Add resolved reports to current month and a past month to exit cold start mode.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-sm text-gray-600">Resolution time:</label>
              <input
                type="number"
                value={slowResolveDays ?? 3}
                onChange={(e) => onSlowResolveDaysChange(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={30}
                className="w-20 px-2 py-1 border rounded text-center"
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-sm text-gray-600">Past month:</label>
              <select
                value={coldStartPastMonth}
                onChange={(e) => onColdStartPastMonthChange(parseInt(e.target.value))}
                className="px-2 py-1 border rounded"
              >
                <option value={1}>1 month ago</option>
                <option value={2}>2 months ago</option>
                <option value={3}>3 months ago</option>
                <option value={4}>4 months ago</option>
                <option value={5}>5 months ago</option>
              </select>
            </div>
            <button
              onClick={() => onTriggerSlowResponse(true)}
              disabled={!canTrigger || isLoading}
              className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition-all ${
                canTrigger && !isLoading
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? "⏳ Adding reports..." : `🚀 Add Reports to Current + ${coldStartPastMonth} Month(s) Ago`}
            </button>
          </div>
        </div>
      )}
      
      {/* GEO CLUSTER - Always show config (can trigger multiple clusters) */}
      {result.anomalyType === "geo_cluster" && (
        <div className="border-t pt-3 mt-3">
          {result.isTriggered && (
            <p className="text-xs text-green-600 mb-2">✅ Anomaly already triggered. You can add more clusters below.</p>
          )}
          <p className="text-sm text-gray-600 font-semibold mb-2">📍 Cluster Locations:</p>
          
          {clusterConfigs.map((cluster, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border mb-2">
              <span className="text-xs text-gray-500 w-6">#{index + 1}</span>
              <label className="text-xs text-gray-500">Lat:</label>
              <input
                type="number"
                step="0.0001"
                value={cluster.lat ?? 0}
                onChange={(e) => onUpdateCluster(index, "lat", parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 border rounded text-xs"
                placeholder="Lat"
              />
              <label className="text-xs text-gray-500">Lng:</label>
              <input
                type="number"
                step="0.0001"
                value={cluster.lng ?? 0}
                onChange={(e) => onUpdateCluster(index, "lng", parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 border rounded text-xs"
                placeholder="Lng"
              />
              <label className="text-xs text-gray-500">R:</label>
              <input
                type="number"
                min={10}
                max={5000}
                value={cluster.radius ?? 150}
                onChange={(e) => onUpdateCluster(index, "radius", parseInt(e.target.value) || 150)}
                className="w-16 px-2 py-1 border rounded text-xs text-center"
                placeholder="Radius"
                title="Radius in meters"
              />
              <span className="text-xs text-gray-400">m</span>
              <label className="text-xs text-gray-500">N:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={cluster.count ?? 5}
                onChange={(e) => onUpdateCluster(index, "count", parseInt(e.target.value) || 5)}
                className="w-14 px-2 py-1 border rounded text-xs text-center"
                placeholder="Count"
              />
              {clusterConfigs.length > 1 && (
                <button
                  onClick={() => onRemoveCluster(index)}
                  className="text-red-500 hover:text-red-700 text-lg"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          
          <button
            onClick={onAddCluster}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-2"
          >
            + Add another cluster location
          </button>
          
          <button
            onClick={onTriggerGeoCluster}
            disabled={!canTrigger || isLoading}
            className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition-all ${
              canTrigger && !isLoading
                ? "bg-purple-500 hover:bg-purple-600"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isLoading 
              ? "⏳ Adding reports..." 
              : `🚀 Add ${clusterConfigs.reduce((sum, c) => sum + c.count, 0)} Clustered Reports`}
          </button>
        </div>
      )}
      
      {/* SPIKE and SLOW RESPONSE (non-cold) triggers */}
      {!result.isTriggered && result.mode !== "cold" && (
        <div className="border-t pt-3 mt-3">
          {/* SPIKE TRIGGER */}
          {result.anomalyType === "spike" && result.reportsNeeded > 0 && (
            <button
              onClick={() => onTriggerSpike(result.reportsNeeded)}
              disabled={!canTrigger || isLoading}
              className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition-all ${
                canTrigger && !isLoading
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? "⏳ Adding reports..." : `🚀 Add ${result.reportsNeeded} Reports to Trigger Spike`}
            </button>
          )}
          
          {/* SLOW RESPONSE TRIGGER (normal mode) */}
          {result.anomalyType === "slow_response" && (
            <div className="space-y-3">
              {/* MANUAL MODE - Always available */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-300">
                <p className="text-sm font-bold text-gray-700 mb-3">🎛️ MANUAL MODE</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-sm text-gray-600 min-w-[100px]">Resolution time:</label>
                    <input
                      type="number"
                      value={slowResolveDays ?? 3}
                      onChange={(e) => onSlowResolveDaysChange(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      max={30}
                      className="w-20 px-2 py-1 border rounded text-center"
                    />
                    <span className="text-sm text-gray-600">days</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-sm text-gray-600 min-w-[100px]">Target month:</label>
                    <select
                      id="manual-month-select"
                      className="px-3 py-1 border rounded text-sm flex-1"
                      defaultValue="1"
                    >
                      <option value="0">Current month (Jan 2026)</option>
                      <option value="1">1 month ago (Dec 2025)</option>
                      <option value="2">2 months ago (Nov 2025)</option>
                      <option value="3">3 months ago (Oct 2025)</option>
                      <option value="4">4 months ago (Sep 2025)</option>
                      <option value="5">5 months ago (Aug 2025)</option>
                      <option value="6">6 months ago (Jul 2025)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-sm text-gray-600 min-w-[100px]">Report count:</label>
                    <input
                      type="number"
                      id="manual-count-input"
                      defaultValue={5}
                      min={1}
                      max={30}
                      className="w-20 px-2 py-1 border rounded text-center"
                    />
                    <span className="text-sm text-gray-500 text-xs">reports</span>
                  </div>
                  <button
                    onClick={() => {
                      const monthSelect = document.getElementById('manual-month-select') as HTMLSelectElement;
                      const countInput = document.getElementById('manual-count-input') as HTMLInputElement;
                      const offset = parseInt(monthSelect?.value || '1');
                      const count = parseInt(countInput?.value || '5');
                      onTriggerSlowResponse(false, count, offset);
                    }}
                    disabled={!canTrigger || isLoading}
                    className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition-all ${
                      canTrigger && !isLoading
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? "⏳ Adding..." : "➕ Add Reports Manually"}
                  </button>
                </div>
              </div>
              
              {/* ONE-CLICK AUTO-TRIGGER */}
              {(() => {
                const now = Date.now();
                const monthStart = getMonthStart(now, 0);
                const daysIntoMonth = (now - monthStart) / (1000 * 60 * 60 * 24);
                const maxPossibleDays = Math.floor(daysIntoMonth - 0.1);
                
                // Determine strategy based on mode and date
                let strategy: {
                  description: string;
                  months: Array<{ offset: number; count: number; resolutionDays: number }>;
                };
                
                if (result.mode === "static") {
                  // Static mode: Build history first, then trigger
                  // Strategy: Add low-res to 2 old months, then VERY HIGH res to last month
                  // This exits static mode AND triggers because adaptive threshold will be ~13d
                  // but we'll have added 28d resolution which is > 13d
                  strategy = {
                    description: "Exit static mode + trigger anomaly",
                    months: [
                      { offset: 3, count: 3, resolutionDays: 2 },  // 3 months ago: 3 reports @ 2d
                      { offset: 2, count: 3, resolutionDays: 2 },  // 2 months ago: 3 reports @ 2d
                      { offset: 1, count: 10, resolutionDays: 28 }, // Last month: 10 reports @ 28d (high enough to trigger)
                    ]
                  };
                } else {
                  // Adaptive mode: Just add VERY high-resolution reports to trigger
                  // Need to beat threshold + buffer
                  const targetResolution = Math.max(Math.ceil(result.threshold + 8), 25);
                  
                  if (maxPossibleDays >= targetResolution) {
                    // Can trigger in current month
                    strategy = {
                      description: "Trigger in current month",
                      months: [
                        { offset: 0, count: 15, resolutionDays: targetResolution }
                      ]
                    };
                  } else {
                    // Trigger in last month
                    strategy = {
                      description: "Trigger in last month",
                      months: [
                        { offset: 1, count: 15, resolutionDays: targetResolution }
                      ]
                    };
                  }
                }
                
                const totalReports = strategy.months.reduce((sum, m) => sum + m.count, 0);
                
                return (
                  <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
                    <p className="text-sm font-bold text-green-800 mb-2">
                      🎯 ONE-CLICK AUTO-TRIGGER
                    </p>
                    <div className="text-xs text-gray-700 mb-3 space-y-1">
                      <p><strong>Strategy:</strong> {strategy.description}</p>
                      <p><strong>Mode:</strong> {result.mode} (threshold: {result.threshold.toFixed(1)}d)</p>
                      <p><strong>Plan:</strong></p>
                      <ul className="ml-4 list-disc space-y-1">
                        {strategy.months.map((m, i) => (
                          <li key={i}>
                            {m.offset === 0 ? 'Current month' : 
                             m.offset === 1 ? 'Last month' : 
                             `${m.offset} months ago`}: 
                            Add {m.count} reports @ {m.resolutionDays}d resolution
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2"><strong>Total:</strong> {totalReports} reports across {strategy.months.length} month(s)</p>
                    </div>
                    <button
                      onClick={async () => {
                        // Execute the strategy
                        for (const month of strategy.months) {
                          onSlowResolveDaysChange(month.resolutionDays);
                          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
                          onTriggerSlowResponse(false, month.count, month.offset);
                          await new Promise(resolve => setTimeout(resolve, 500)); // Wait between operations
                        }
                      }}
                      disabled={!canTrigger || isLoading}
                      className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all shadow-lg ${
                        canTrigger && !isLoading
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                          : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isLoading ? "⏳ Executing..." : `🚀 TRIGGER NOW (${totalReports} reports)`}
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Helper Functions (match server logic)
// ============================================

function getMonthStart(now: number, monthsBack: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth() - monthsBack, 1).getTime();
}

function buildMonthlyBins(reports: Report[], monthsBack: number, now: number): Bin[] {
  const bins: Bin[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = getMonthStart(now, i);
    const monthEnd = getMonthStart(now, i - 1);

    const count = reports.filter(
      (r) => r.timestamp >= monthStart && r.timestamp < monthEnd
    ).length;

    bins.push({ ts: monthStart, count });
  }

  return bins;
}

function buildAvgResolutionBins(reports: Report[], monthsBack: number, now: number): Bin[] {
  const bins: Bin[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = getMonthStart(now, i);
    const monthEnd = getMonthStart(now, i - 1);

    const monthReports = reports.filter(
      (r) => r.timestamp >= monthStart && r.timestamp < monthEnd && r.resolvedAt
    );

    if (monthReports.length === 0) {
      bins.push({ ts: monthStart, count: 0 });
    } else {
      const totalDays = monthReports.reduce((sum, r) => {
        const days = (r.resolvedAt! - r.timestamp) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      const avgDays = totalDays / monthReports.length;
      
      // Debug log
      console.log(`Month ${new Date(monthStart).toLocaleDateString()}: ${monthReports.length} reports, avg ${avgDays.toFixed(3)} days (${(avgDays * 24).toFixed(1)} hours)`);
      
      bins.push({ ts: monthStart, count: avgDays });
    }
  }

  return bins;
}
