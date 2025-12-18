"use client";
import { useState } from "react";
import Modal from "@/components/dashboard/Modal";
import * as XLSX from "xlsx";

const STATUS_ORDER = ["open", "pending", "in progress", "resolved"];

interface Props {
  open: boolean;
  onClose: () => void;
  city: string | null;
}

export default function StatusTransitionModal({ open, onClose, city }: Props) {
  const [statusStart, setStatusStart] = useState<string | null>(null);
  const [statusEnd, setStatusEnd] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("12");
  const [category, setCategory] = useState("all");
  const [result, setResult] = useState<null | {
    avgDays: number;
    count: number;
  }>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<Record<string, Record<string, { avgDays: number; count: number }>>>({});

  const transitionPairs = [
    { start: "open", end: "pending" },
    { start: "open", end: "in progress" },
    { start: "open", end: "resolved" },
    { start: "pending", end: "in progress" },
    { start: "pending", end: "resolved" },
    { start: "in progress", end: "resolved" },
  ];

  const handleDownloadExcel = async () => {
    setDownloading(true);
    const workbook = XLSX.utils.book_new();

    try {
      for (const pair of transitionPairs) {
        const res = await fetch("/api/statistics/status-transition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthsBack: Number(timeRange),
            category,
            area: city,
            statusStart: pair.start,
            statusEnd: pair.end,
          }),
        });

        const data = await res.json();
        
        const sheetName = `${pair.start.charAt(0).toUpperCase() + pair.start.slice(1)} → ${pair.end.charAt(0).toUpperCase() + pair.end.slice(1)}`.substring(0, 31);
        
        const sheetData = [
          ["Status Transition Analysis"],
          [""],
          ["From Status", pair.start],
          ["To Status", pair.end],
          ["City", city],
          ["Time Range (months)", timeRange],
          ["Report Category", category],
          [""],
          ["Average Days", data.avgDays.toFixed(2)],
          ["Reports Analyzed", data.count],
          [""],
          ["Analysis Generated", new Date().toLocaleString()],
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        worksheet["!cols"] = [{ wch: 25 }, { wch: 30 }];
        
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }

      const fileName = `StatusTransitionAnalysis_${city}_${new Date().getTime()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("Error downloading Excel file:", error);
      alert("Failed to download Excel file");
    } finally {
      setDownloading(false);
    }
  };

  const handleShowHeatmap = async () => {
    setShowHeatmap(true);
    const newHeatmapData: Record<string, Record<string, { avgDays: number; count: number }>> = {};

    for (const from of STATUS_ORDER) {
      newHeatmapData[from] = {};
      for (const to of STATUS_ORDER) {
        if (STATUS_ORDER.indexOf(from) < STATUS_ORDER.indexOf(to)) {
          const res = await fetch("/api/statistics/status-transition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              monthsBack: Number(timeRange),
              category,
              area: city,
              statusStart: from,
              statusEnd: to,
            }),
          });
          const data = await res.json();
          newHeatmapData[from][to] = { avgDays: data.avgDays, count: data.count };
        }
      }
    }

    setHeatmapData(newHeatmapData);
  };

  const getHeatmapColor = (avgDays: number, maxDays: number = 30) => {
    if (avgDays === 0) return "bg-gray-100";
    const ratio = Math.min(avgDays / maxDays, 1);
    if (ratio < 0.25) return "bg-green-100";
    if (ratio < 0.5) return "bg-yellow-100";
    if (ratio < 0.75) return "bg-orange-100";
    return "bg-red-100";
  };


  if (!open) return null;

  if (!city) {
    return (
      <Modal title="Status Transition Analysis" onClose={onClose}>
        <div className="flex items-center justify-center p-8">
          <p className="text-red-600">No city assigned to your account</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Status Transition Analysis" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          This view analyzes how long it takes for reports to move from one
          status to another, based on historical status changes.
        </p>

        {/* City Display */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm font-semibold text-blue-900">
            📍 Analyzing data for: <span className="text-blue-700">{city}</span>
          </p>
        </div>

        {/* Select time range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="w-full p-2 border rounded">
            <option value="1">Last month</option>
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last year</option>
          </select>
        </div>

        {/* Select report type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Report Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded">
            <option value="all">All categories</option>
            <option value="garbage">Garbage</option>
            <option value="tree">Tree</option>
            <option value="lighting">Lighting</option>
          </select>
        </div>

        {/* Select Start */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Status</label>
          <select
            value={statusStart ?? ""}
            onChange={(e) => {
              setStatusStart(e.target.value);
              setStatusEnd(null);
            }}
            className="w-full p-2 border rounded"
          >
            <option value="" disabled>
              Select start status
            </option>

            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Select End */}
        {statusStart && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Status</label>
            <select
              value={statusEnd ?? ""}
              onChange={(e) => setStatusEnd(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="" disabled>
                Select end status
              </option>

              {STATUS_ORDER
                .slice(STATUS_ORDER.indexOf(statusStart) + 1)
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </div>
        )}

        {statusStart && statusEnd && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-900">
              <b>Transition:</b> <span className="uppercase font-semibold">{statusStart}</span> → <span className="uppercase font-semibold">{statusEnd}</span>
            </p>
          </div>
        )}

        <div className="flex justify-center gap-3 pt-2">
          <button
            disabled={!statusStart || !statusEnd || analyzing}
            onClick={async () => {
              setAnalyzing(true);
              const res = await fetch("/api/statistics/status-transition", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  monthsBack: Number(timeRange),
                  category,
                  area: city,
                  statusStart,
                  statusEnd,
                }),
              });

              const data = await res.json();
              setResult(data);
              setAnalyzing(false);
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? "Analyzing..." : "Analyze"}
          </button>

          <button
            disabled={downloading}
            onClick={handleDownloadExcel}
            className="px-6 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            📥 {downloading ? "Downloading..." : "Full-Report (Excel)"}
          </button>

          <button
            onClick={handleShowHeatmap}
            className="px-6 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700 flex items-center gap-2"
          >
            🔥 View Heatmap
          </button>
        </div>

        {showHeatmap && Object.keys(heatmapData).length > 0 && (
          <div className="mt-6 p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
            <h3 className="text-lg font-bold text-purple-900 mb-4"> Status Transition Heatmap</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 bg-purple-200 text-purple-900 font-semibold border">From \ To</th>
                    {STATUS_ORDER.map((status) => (
                      <th key={status} className="p-2 bg-purple-200 text-purple-900 font-semibold border text-sm">
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STATUS_ORDER.map((fromStatus) => (
                    <tr key={fromStatus}>
                      <td className="p-2 bg-purple-100 text-purple-900 font-semibold border text-sm">
                        {fromStatus.charAt(0).toUpperCase() + fromStatus.slice(1)}
                      </td>
                      {STATUS_ORDER.map((toStatus) => {
                        const data = heatmapData[fromStatus]?.[toStatus];
                        const isValid = STATUS_ORDER.indexOf(fromStatus) < STATUS_ORDER.indexOf(toStatus);

                        if (!isValid) {
                          return (
                            <td key={`${fromStatus}-${toStatus}`} className="p-2 border bg-gray-50">
                              -
                            </td>
                          );
                        }

                        return (
                          <td
                            key={`${fromStatus}-${toStatus}`}
                            className={`p-3 border font-semibold text-center transition-colors ${getHeatmapColor(data?.avgDays || 0)}`}
                            title={`${data?.avgDays.toFixed(2) || 0} days (${data?.count || 0} reports)`}
                          >
                            <div className="text-sm font-bold text-gray-800">{data?.avgDays.toFixed(1) || "—"}</div>
                            <div className="text-xs text-gray-600">({data?.count || 0})</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex gap-4 flex-wrap justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100 border border-green-300"></div>
                <span>0-7.5 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-100 border border-yellow-300"></div>
                <span>7.5-15 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-100 border border-orange-300"></div>
                <span>15-22.5 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-100 border border-red-300"></div>
                <span>22.5+ days</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-3 text-center">
              Values show average days to transition | Numbers in parentheses show report count
            </p>
          </div>
        )}

        {result && (
          <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
            <div className="space-y-4">
              {/* Main Metric */}
              <div className="text-center">
                <p className="text-sm text-gray-600 uppercase tracking-wider">Average Transition Time</p>
                <p className="text-4xl font-bold text-green-700 mt-1">
                  {result.avgDays.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1">days</p>
              </div>

              {/* Report Count */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded p-3 border border-green-200">
                  <p className="text-xs text-gray-600 uppercase">Reports Analyzed</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{result.count}</p>
                </div>
                <div className="bg-white rounded p-3 border border-green-200">
                  <p className="text-xs text-gray-600 uppercase">City</p>
                  <p className="text-lg font-semibold text-gray-700 mt-1">{city}</p>
                </div>
              </div>

              {/* Visual Bar */}
              <div className="bg-white rounded p-3 border border-green-200">
                <div className="flex items-end justify-between h-16">
                  <div className="w-full bg-gray-100 rounded flex items-end justify-center overflow-hidden">
                    <div
                      className="bg-gradient-to-t from-green-500 to-emerald-400 rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.min((result.avgDays / 30) * 100, 100)}%`,
                        minHeight: "4px",
                      }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Days Scale (30 days = full height)</p>
              </div>

              {/* Summary Text */}
              <div className="bg-white rounded p-3 border border-green-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-semibold">Summary:</span> In {city}, reports take an average of{" "}
                  <span className="font-bold text-green-700">{result.avgDays.toFixed(1)} days</span> to transition from{" "}
                  <span className="uppercase text-sm font-semibold">{statusStart}</span> to{" "}
                  <span className="uppercase text-sm font-semibold">{statusEnd}</span> based on{" "}
                  <span className="font-bold">{result.count} reports</span> analyzed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
