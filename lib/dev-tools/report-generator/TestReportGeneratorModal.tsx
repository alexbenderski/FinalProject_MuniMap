"use client";

/**
 * Test Report Generator Modal - UI Component
 * 
 * This modal provides a UI for generating and inserting test reports into Firebase.
 * It is completely isolated from production components.
 * 
 * To remove this feature:
 * 1. Delete the /lib/dev-tools/report-generator folder
 * 2. Remove the import and button from dashboard/page.tsx
 */

import React, { useState, useEffect } from "react";
import {
  generateReports,
  validateConfig,
  GeneratorConfig,
  EndStatus,
  STATUS_OPTIONS,
  CATEGORIES,
} from "./generateReports";
import { writeReportsToFirebase, WriteResult } from "./writeReportsToFirebase";
import { Category } from "@/lib/categories";

interface Props {
  open: boolean;
  onClose: () => void;
  cityName: string;
  cityBoundary: { lat: number; lng: number }[];
  defaultCenter?: { lat: number; lng: number };
}

type Step = "config" | "preview" | "writing" | "result";

export default function TestReportGeneratorModal({
  open,
  onClose,
  cityName,
  cityBoundary,
  defaultCenter,
}: Props) {
  // State
  const [step, setStep] = useState<Step>("config");
  const [errors, setErrors] = useState<string[]>([]);
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null);

  // Form state
  const [endStatus, setEndStatus] = useState<EndStatus>("resolved");
  const [reportType, setReportType] = useState<Category>("garbage");
  
  // Time ranges for each status
  const [openStartDate, setOpenStartDate] = useState<string>("");
  const [openStartTime, setOpenStartTime] = useState<string>("00:00");
  const [openEndDate, setOpenEndDate] = useState<string>("");
  const [openEndTime, setOpenEndTime] = useState<string>("23:59");
  
  const [pendingStartDate, setPendingStartDate] = useState<string>("");
  const [pendingStartTime, setPendingStartTime] = useState<string>("00:00");
  const [pendingEndDate, setPendingEndDate] = useState<string>("");
  const [pendingEndTime, setPendingEndTime] = useState<string>("23:59");
  
  const [inProgressStartDate, setInProgressStartDate] = useState<string>("");
  const [inProgressStartTime, setInProgressStartTime] = useState<string>("00:00");
  const [inProgressEndDate, setInProgressEndDate] = useState<string>("");
  const [inProgressEndTime, setInProgressEndTime] = useState<string>("23:59");
  
  const [resolvedStartDate, setResolvedStartDate] = useState<string>("");
  const [resolvedStartTime, setResolvedStartTime] = useState<string>("00:00");
  const [resolvedEndDate, setResolvedEndDate] = useState<string>("");
  const [resolvedEndTime, setResolvedEndTime] = useState<string>("23:59");
  
  const [centerLat, setCenterLat] = useState<string>("");
  const [centerLng, setCenterLng] = useState<string>("");
  const [radius, setRadius] = useState<string>("500");
  const [count, setCount] = useState<string>("10");

  // Preview state
  const [generatedReports, setGeneratedReports] = useState<ReturnType<typeof generateReports>["reports"]>([]);

  // Initialize defaults
  useEffect(() => {
    if (open && defaultCenter) {
      setCenterLat(defaultCenter.lat.toFixed(6));
      setCenterLng(defaultCenter.lng.toFixed(6));
    }
    
    // Set default dates (last 7 days distributed across statuses)
    if (open) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      // Open: 7 days ago to 6 days ago
      setOpenStartDate(sevenDaysAgo.toISOString().split("T")[0]);
      setOpenEndDate(sixDaysAgo.toISOString().split("T")[0]);
      
      // Pending: 6 days ago to 4 days ago
      setPendingStartDate(sixDaysAgo.toISOString().split("T")[0]);
      setPendingEndDate(fourDaysAgo.toISOString().split("T")[0]);
      
      // In Progress: 4 days ago to 2 days ago
      setInProgressStartDate(fourDaysAgo.toISOString().split("T")[0]);
      setInProgressEndDate(twoDaysAgo.toISOString().split("T")[0]);
      
      // Resolved: 2 days ago to now
      setResolvedStartDate(twoDaysAgo.toISOString().split("T")[0]);
      setResolvedEndDate(now.toISOString().split("T")[0]);
    }
  }, [open, defaultCenter]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep("config");
      setErrors([]);
      setWriteResult(null);
      setGeneratedReports([]);
    }
  }, [open]);

  if (!open) return null;

  // Build config from form
  const buildConfig = (): GeneratorConfig | null => {
    const openTimeRangeStart = new Date(`${openStartDate}T${openStartTime}`).getTime();
    const openTimeRangeEnd = new Date(`${openEndDate}T${openEndTime}`).getTime();
    
    if (isNaN(openTimeRangeStart) || isNaN(openTimeRangeEnd)) {
      setErrors(["Invalid date/time format for Open status"]);
      return null;
    }

    const lat = parseFloat(centerLat);
    const lng = parseFloat(centerLng);
    const radiusNum = parseFloat(radius);
    const countNum = parseInt(count, 10);

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusNum) || isNaN(countNum)) {
      setErrors(["Invalid numeric values"]);
      return null;
    }

    const config: GeneratorConfig = {
      endStatus,
      reportType,
      clusterCenter: { lat, lng },
      radiusMeters: radiusNum,
      count: countNum,
      cityBoundary,
      area: cityName,
      openTimeRange: {
        start: openTimeRangeStart,
        end: openTimeRangeEnd,
      },
    };

    // Add pending time range if needed
    if (endStatus === "pending" || endStatus === "in progress" || endStatus === "resolved") {
      const pendingStart = new Date(`${pendingStartDate}T${pendingStartTime}`).getTime();
      const pendingEnd = new Date(`${pendingEndDate}T${pendingEndTime}`).getTime();
      
      if (isNaN(pendingStart) || isNaN(pendingEnd)) {
        setErrors(["Invalid date/time format for Pending status"]);
        return null;
      }
      
      config.pendingTimeRange = {
        start: pendingStart,
        end: pendingEnd,
      };
    }

    // Add in progress time range if needed
    if (endStatus === "in progress" || endStatus === "resolved") {
      const inProgressStart = new Date(`${inProgressStartDate}T${inProgressStartTime}`).getTime();
      const inProgressEnd = new Date(`${inProgressEndDate}T${inProgressEndTime}`).getTime();
      
      if (isNaN(inProgressStart) || isNaN(inProgressEnd)) {
        setErrors(["Invalid date/time format for In Progress status"]);
        return null;
      }
      
      config.inProgressTimeRange = {
        start: inProgressStart,
        end: inProgressEnd,
      };
    }

    // Add resolved time range if needed
    if (endStatus === "resolved") {
      const resolvedStart = new Date(`${resolvedStartDate}T${resolvedStartTime}`).getTime();
      const resolvedEnd = new Date(`${resolvedEndDate}T${resolvedEndTime}`).getTime();
      
      if (isNaN(resolvedStart) || isNaN(resolvedEnd)) {
        setErrors(["Invalid date/time format for Resolved status"]);
        return null;
      }
      
      config.resolvedTimeRange = {
        start: resolvedStart,
        end: resolvedEnd,
      };
    }

    return config;
  };

  // Handle preview
  const handlePreview = () => {
    setErrors([]);
    const config = buildConfig();
    if (!config) return;

    const validation = validateConfig(config);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const result = generateReports(config);
    if (result.errors.length > 0) {
      setErrors(result.errors);
    }
    
    if (result.reports.length > 0) {
      setGeneratedReports(result.reports);
      setStep("preview");
    } else if (result.errors.length === 0) {
      setErrors(["No reports generated"]);
    }
  };

  // Handle write to Firebase
  const handleWrite = async () => {
    setStep("writing");
    setErrors([]);

    try {
      const result = await writeReportsToFirebase(generatedReports);
      setWriteResult(result);
      setStep("result");
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Write failed"]);
      setStep("preview");
    }
  };

  // Handle close
  const handleClose = () => {
    setStep("config");
    setErrors([]);
    setWriteResult(null);
    setGeneratedReports([]);
    onClose();
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">🧪 Test Report Generator</h2>
            <p className="text-sm text-orange-100">QA/Testing Tool - Not for Production</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-orange-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-semibold text-red-700 mb-2">⚠️ Errors:</p>
              <ul className="list-disc list-inside text-red-600 text-sm">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step: Config */}
          {step === "config" && (
            <div className="space-y-6">
              {/* City Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>City:</strong> {cityName} | 
                  <strong> Boundary Points:</strong> {cityBoundary.length}
                </p>
              </div>

              {/* Time Range */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">📅 Status Time Ranges</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Configure when each status occurs. Each range must not overlap with the next status.
                </p>
                
                {/* Open Status - Always visible */}
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-700 mb-2">🟢 Open Status</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={openStartDate}
                        onChange={(e) => setOpenStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={openStartTime}
                        onChange={(e) => setOpenStartTime(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={openEndDate}
                        onChange={(e) => setOpenEndDate(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={openEndTime}
                        onChange={(e) => setOpenEndTime(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Pending Status - Show if end status requires it */}
                {(endStatus === "pending" || endStatus === "in progress" || endStatus === "resolved") && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-700 mb-2">🟡 Pending Status</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={pendingStartDate}
                          onChange={(e) => setPendingStartDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={pendingStartTime}
                          onChange={(e) => setPendingStartTime(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={pendingEndDate}
                          onChange={(e) => setPendingEndDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">End Time</label>
                        <input
                          type="time"
                          value={pendingEndTime}
                          onChange={(e) => setPendingEndTime(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-yellow-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* In Progress Status - Show if end status requires it */}
                {(endStatus === "in progress" || endStatus === "resolved") && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-700 mb-2">🔵 In Progress Status</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={inProgressStartDate}
                          onChange={(e) => setInProgressStartDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={inProgressStartTime}
                          onChange={(e) => setInProgressStartTime(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={inProgressEndDate}
                          onChange={(e) => setInProgressEndDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">End Time</label>
                        <input
                          type="time"
                          value={inProgressEndTime}
                          onChange={(e) => setInProgressEndTime(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Resolved Status - Show if end status is resolved */}
                {endStatus === "resolved" && (
                  <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-700 mb-2">🟣 Resolved Status</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={resolvedStartDate}
                          onChange={(e) => setResolvedStartDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={resolvedStartTime}
                          onChange={(e) => setResolvedStartTime(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={resolvedEndDate}
                          onChange={(e) => setResolvedEndDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">End Time</label>
                        <input
                          type="time"
                          value={resolvedEndTime}
                          onChange={(e) => setResolvedEndTime(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status & Type */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">📊 Report Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">End Status</label>
                    <select
                      value={endStatus}
                      onChange={(e) => setEndStatus(e.target.value as EndStatus)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {formatStatus(s)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Progression: open → pending → in progress → resolved
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Report Type</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as Category)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Cluster */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">📍 Cluster Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Center Latitude</label>
                    <input
                      type="text"
                      value={centerLat}
                      onChange={(e) => setCenterLat(e.target.value)}
                      placeholder="e.g., 32.0853"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Center Longitude</label>
                    <input
                      type="text"
                      value={centerLng}
                      onChange={(e) => setCenterLng(e.target.value)}
                      placeholder="e.g., 34.7818"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Radius (meters)</label>
                    <input
                      type="number"
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      min="10"
                      max="10000"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Number of Reports</label>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      min="1"
                      max="100"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 font-semibold">
                  ✅ Generated {generatedReports.length} reports ready to write
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Timestamp</th>
                      <th className="px-3 py-2 text-left">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedReports.map((r, i) => (
                      <tr key={r.generatedId} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">{i + 1}</td>
                        <td className="px-3 py-2 capitalize">{r.type}</td>
                        <td className="px-3 py-2 capitalize">{r.status}</td>
                        <td className="px-3 py-2">
                          {new Date(r.timestamp).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>⚠️ Warning:</strong> These reports will be written to the live Firebase database.
                  Each report has an ID prefixed with &quot;test_&quot; for easy identification and cleanup.
                </p>
              </div>
            </div>
          )}

          {/* Step: Writing */}
          {step === "writing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Writing reports to Firebase...</p>
            </div>
          )}

          {/* Step: Result */}
          {step === "result" && writeResult && (
            <div className="space-y-4">
              {writeResult.success ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-semibold text-lg mb-2">
                    ✅ Successfully written {writeResult.writtenCount} reports!
                  </p>
                  <p className="text-green-600 text-sm">
                    Reports are now available in Firebase under Reports/{reportType}/
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700 font-semibold mb-2">
                    ⚠️ Partially completed
                  </p>
                  <p className="text-yellow-600 text-sm">
                    Written: {writeResult.writtenCount} | Failed: {writeResult.failedCount}
                  </p>
                </div>
              )}

              {writeResult.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-semibold text-red-700 mb-2">Errors:</p>
                  <ul className="list-disc list-inside text-red-600 text-sm max-h-40 overflow-y-auto">
                    {writeResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {writeResult.writtenIds.length > 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="font-semibold text-gray-700 mb-2">Written Report IDs:</p>
                  <div className="max-h-32 overflow-y-auto text-xs text-gray-600 font-mono">
                    {writeResult.writtenIds.map((id) => (
                      <div key={id}>{id}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-between bg-gray-50">
          {step === "config" && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold"
              >
                Generate Preview →
              </button>
            </>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={() => setStep("config")}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <button
                onClick={handleWrite}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Write to Firebase ✓
              </button>
            </>
          )}

          {step === "writing" && (
            <div className="w-full text-center text-gray-500">Please wait...</div>
          )}

          {step === "result" && (
            <>
              <button
                onClick={() => {
                  setStep("config");
                  setGeneratedReports([]);
                  setWriteResult(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Generate More
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
