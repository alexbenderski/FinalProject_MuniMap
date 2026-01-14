"use client";
import { useState } from "react";
import Modal from "@/components/dashboard/common/Modal";
import * as XLSX from "xlsx";
import Tooltip from "../common/Tooltip";
import { useLanguage } from "@/lib/i18n";

const STATUS_ORDER = ["open", "pending", "in progress", "resolved"];

// SLA thresholds in days (matching lib/server/sla.ts)
const SLA_DAYS: Record<string, number> = {
  garbage: 4,
  lighting: 10,
  tree: 14,
  hazard: 2,
  animal: 3,
  maintenance: 21,
  pest: 7,
  all: 8, // Default average for "all categories"
};

// Get SLA for the selected category
const getSLA = (category: string): number => {
  return SLA_DAYS[category] ?? 7;
};

interface Props {
  open: boolean;
  onClose: () => void;
  city: string | null;
}

const getTimeRangeLabel = (months: string) => {
  const monthsNum = Number(months);
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - monthsNum);
  
  const formatDateShort = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  };
  
  const rangeText = `${formatDateShort(startDate)}-${formatDateShort(endDate)}`;
  
  return rangeText;
};

const getTimeRangeLabelFull = (months: string) => {
  const monthsNum = Number(months);
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - monthsNum);
  
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
  const rangeText = `${formatDate(startDate)} to ${formatDate(endDate)}`;
  const periodText = monthsNum === 1 ? "Last 1 month" : `Last ${monthsNum} months`;
  
  return `${periodText} (${rangeText})`;
};

export default function StatusTransitionModal({ open, onClose, city }: Props) {
  const { t } = useLanguage();
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
  const [showInstructions, setShowInstructions] = useState(false);
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
          [t("statusTransition.statusTransitionAnalysis")],
          [""],
          [t("statusTransition.fromStatusLabel"), pair.start],
          [t("statusTransition.toStatusLabel"), pair.end],
          [t("statusTransition.cityLabel"), city],
          [t("statusTransition.timeRangeLabel"), getTimeRangeLabelFull(timeRange)],
          [t("statusTransition.reportCategoryLabel"), category],
          [""],
          [t("statusTransition.avgDaysLabel"), data.avgDays.toFixed(2)],
          [t("statusTransition.reportsAnalyzedCountLabel"), data.count],
          [""],
          [t("statusTransition.analysisGenerated"), new Date().toLocaleString()],
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

  // SLA-based heatmap coloring:
  // Green = ≤50% SLA, Yellow = 50-100% SLA, Orange = 100-200% SLA, Red = >200% SLA
  const getHeatmapColor = (avgDays: number) => {
    if (avgDays === 0) return "bg-gray-100";
    const sla = getSLA(category);
    const ratio = avgDays / sla;
    if (ratio <= 0.5) return "bg-green-100";  // ≤50% of SLA
    if (ratio <= 1) return "bg-yellow-100";   // 50-100% of SLA
    if (ratio <= 2) return "bg-orange-100";   // 100-200% of SLA
    return "bg-red-100";                       // >200% of SLA
  };


  if (!open) return null;

  if (!city) {
    return (
      <Modal title={t("statusTransition.title")} onClose={onClose}>
        <div className="flex items-center justify-center p-8">
          <p className="text-red-600">{t("statusTransition.noCityAssigned")}</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={t("statusTransition.title")} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          {t("statusTransition.description")}
        </p>

        {/* City Display */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm font-semibold text-blue-900">
            {t("statusTransition.analyzingDataFor")} <span className="text-blue-700">{city}</span>
          </p>
        </div>

        {/* Instructions Guide - Collapsible */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full p-4 flex items-center justify-between hover:bg-indigo-100 transition-colors text-left"
          >
            <span className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
              {t("statusTransition.howToAnalyze")}
              <Tooltip message="Click to expand/collapse instructions" position="top" />
            </span>
            <span className={`text-lg text-indigo-900 transition-transform duration-300 ${showInstructions ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>
          
          {showInstructions && (
            <ol className="text-xs text-indigo-800 space-y-2 list-decimal list-inside p-4 pt-0 bg-white bg-opacity-50 border-t border-indigo-200">
              <li>{t("statusTransition.instructions.step1")}</li>
              <li>{t("statusTransition.instructions.step2")}</li>
              <li>{t("statusTransition.instructions.step3")}</li>
              <li>{t("statusTransition.instructions.step4")}</li>
              <li>{t("statusTransition.instructions.step5")}</li>
            </ol>
          )}
        </div>

        {/* Select time range */}
        <div className="max-w-sm mx-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("statusTransition.timeRange")}</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="w-full p-2 border rounded">
            <option value="1">{t("statusTransition.lastMonth")}</option>
            <option value="3">{t("statusTransition.last3Months")}</option>
            <option value="6">{t("statusTransition.last6Months")}</option>
            <option value="12">{t("statusTransition.lastYear")}</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">📅 {getTimeRangeLabel(timeRange)}</p>
        </div>

        {/* Select report type */}
        <div className="max-w-sm mx-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("statusTransition.reportCategory")}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded">
            <option value="all">{t("statusTransition.allCategories")}</option>
            <option value="garbage">{t("categories.garbage")}</option>
            <option value="lighting">{t("categories.lighting")}</option>
            <option value="tree">{t("categories.tree")}</option>
            <option value="hazard">{t("categories.hazard")}</option>
            <option value="animal">{t("categories.animal")}</option>
            <option value="maintenance">{t("categories.maintenance")}</option>
            <option value="pest">{t("categories.pest")}</option>
          </select>
        </div>

        {/* Select Start */}
        <div className="max-w-sm mx-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("statusTransition.fromStatus")}</label>
          <select
            value={statusStart ?? ""}
            onChange={(e) => {
              setStatusStart(e.target.value);
              setStatusEnd(null);
            }}
            className="w-full p-2 border rounded"
          >
            <option value="" disabled>
              {t("statusTransition.selectStartStatus")}
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
          <div className="max-w-sm mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("statusTransition.toStatus")}</label>
            <select
              value={statusEnd ?? ""}
              onChange={(e) => setStatusEnd(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="" disabled>
                {t("statusTransition.selectEndStatus")}
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
              <b>{t("statusTransition.transition")}</b> <span className="uppercase font-semibold">{statusStart}</span> → <span className="uppercase font-semibold">{statusEnd}</span>
            </p>
          </div>
        )}

        {/* Buttons Section */}
        <div className="relative pt-4">
          {/* Excel button positioned top right */}
          <div className="absolute top-0 right-0">
            <button
              disabled={downloading}
              onClick={handleDownloadExcel}
              className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              title={t("statusTransition.downloadComplete")}
            >
              📅 {downloading ? t("statusTransition.downloading") : t("statusTransition.excelReport")}
              <Tooltip message={t("statusTransition.downloadComplete")} />
            </button>
          </div>

          {/* Center buttons */}
          <div className="flex justify-center gap-3">
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
              className="px-6 py-2 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              title={t("statusTransition.analyzeTooltip")}
            >
              {analyzing ? t("statusTransition.analyzing") : t("statusTransition.analyze")}
              <Tooltip message={t("statusTransition.analyzeTooltip")} />
            </button>

            <button
              onClick={handleShowHeatmap}
              className="px-6 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700 flex items-center gap-1"
              title={t("statusTransition.heatmapTooltip")}
            >
              🔥 {t("statusTransition.viewHeatmap")}
              <Tooltip message={t("statusTransition.heatmapTooltip")} />
            </button>
          </div>
        </div>

        {showHeatmap && Object.keys(heatmapData).length > 0 && (
          <div className="mt-6 p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
            <h3 className="text-lg font-bold text-purple-900 mb-4">
              📊 {t("statusTransition.statusTransitionHeatmap")}
              <span className="text-sm font-semibold text-purple-700 ml-2">
                ({category === "all" ? t("statusTransition.allCategories") : category.charAt(0).toUpperCase() + category.slice(1)})
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 bg-purple-200 text-purple-900 font-semibold border">{t("statusTransition.fromTo")}</th>
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
                              {t("statusTransition.noData")}
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

            {/* Legend - SLA-based thresholds */}
            <div className="mt-4 flex gap-4 flex-wrap justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100 border border-green-300"></div>
                <span>≤50% SLA ({(getSLA(category) * 0.5).toFixed(1)} {t("days")})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-100 border border-yellow-300"></div>
                <span>50-100% SLA ({(getSLA(category) * 0.5).toFixed(1)}-{getSLA(category)} {t("days")})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-100 border border-orange-300"></div>
                <span>100-200% SLA ({getSLA(category)}-{getSLA(category) * 2} {t("days")})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-100 border border-red-300"></div>
                <span>&gt;200% SLA (&gt;{getSLA(category) * 2} {t("days")})</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-3 text-center">
              {t("statusTransition.heatmapLegend")} | SLA: {getSLA(category)} {t("days")}
            </p>
          </div>
        )}

        {result && (
          <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
            <div className="space-y-4">
              {/* Main Metric */}
              <div className="text-center">
                <p className="text-sm text-gray-600 uppercase tracking-wider">{t("statusTransition.avgTransitionTime")}</p>
                <p className="text-4xl font-bold text-green-700 mt-1">
                  {result.avgDays.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1">days</p>
              </div>

              {/* Report Count */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded p-3 border border-green-200">
                  <p className="text-xs text-gray-600 uppercase">{t("statusTransition.reportsAnalyzed")}</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{result.count}</p>
                </div>
                <div className="bg-white rounded p-3 border border-green-200">
                  <p className="text-xs text-gray-600 uppercase">{t("statusTransition.cityLabel")}</p>
                  <p className="text-lg font-semibold text-gray-700 mt-1">{city}</p>
                </div>
                <div className="bg-white rounded p-3 border border-green-200">
                  <p className="text-xs text-gray-600 uppercase">{t("statusTransition.timeRangeLabel")}</p>
                  <p className="text-sm font-semibold text-gray-700 mt-1">{getTimeRangeLabel(timeRange)}</p>
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
                <p className="text-xs text-gray-500 mt-2 text-center">{t("statusTransition.daysScale")}</p>
              </div>

              {/* Summary Text */}
              <div className="bg-white rounded p-3 border border-green-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-semibold">{t("statusTransition.summaryText")}</span>{" "}
                  {t("statusTransition.inCity")} <span className="font-bold text-blue-700">{city}</span>,{" "}
                  {t("statusTransition.avgTimeToTransition")}{" "}
                  <span className="uppercase text-sm font-semibold">{statusStart}</span> {t("statusTransition.to")}{" "}
                  <span className="uppercase text-sm font-semibold">{statusEnd}</span>{" "}
                  {t("statusTransition.is")} <span className="font-bold text-green-700">{result.avgDays.toFixed(1)} {t("statusTransition.days")}</span>,{" "}
                  {t("statusTransition.basedOn")}{" "}
                  <span className="font-bold">{result.count} {t("statusTransition.reportsAnalyzedLabel")}</span>{" "}
                  ({getTimeRangeLabel(timeRange)}).
                </p>
              </div>

              {/* Transition Explanation */}
              <div className="bg-blue-50 rounded p-4 border border-blue-200">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="font-semibold text-blue-800 mb-2">{t("statusTransition.whatThisMeans")}</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {t(`statusTransition.explanations.${statusStart}_to_${statusEnd}`)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
