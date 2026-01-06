"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Modal from "@/components/dashboard/common/Modal";
import { fetchResolutionTimeData, subscribeToReports } from "@/lib/client/fetchers";
import GraphsModal from "@/components/dashboard/statistics/GraphsModal";
import DetailedStatsModal from "@/components/dashboard/statistics/DetailedStatsModal";
import { TimeRange, Report } from "@/lib/types";
import RealtimeClock from "../common/RealtimeClock";
import StatusTransitionModal from "./StatusTransitionModal";
import { useLanguage } from "@/lib/i18n";


type Stats = {
  total: number;
  open: number;
  pending: number;
  inProgress: number;
  resolved: number;
};

export default function StatisticsModal({
  open,
  onClose,
  city,
}: {
  open: boolean;
  onClose: () => void;
  city: string | null;
}) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    open: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeToResolveData, setTimeToResolveData] = useState<{ month: string; days: number }[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [graphsModalOpen, setGraphsModalOpen] = useState(false);
  const [detailedOpen, setDetailedOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [openStatusTransition, setOpenStatusTransition] = useState(false);
  
  // Store the latest reports data
  const [allReports, setAllReports] = useState<Report[]>([]);

  // Store time range values in refs for real-time callback
  const timeRangeRef = useRef(timeRange);
  const fromDateRef = useRef(fromDate);
  const toDateRef = useRef(toDate);
  const cityRef = useRef(city);
  
  useEffect(() => {
    timeRangeRef.current = timeRange;
    fromDateRef.current = fromDate;
    toDateRef.current = toDate;
    cityRef.current = city;
  }, [timeRange, fromDate, toDate, city]);

  // Calculate stats from reports array
  const calculateStatsFromReports = useCallback((reports: Report[]) => {
    const currentTimeRange = timeRangeRef.current;
    const currentFromDate = fromDateRef.current;
    const currentToDate = toDateRef.current;
    const currentCity = cityRef.current;

    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    if (currentTimeRange === "custom") {
      if (!currentFromDate || !currentToDate) return;
      startDate = new Date(currentFromDate);
      endDate = new Date(new Date(currentToDate).setHours(23, 59, 59, 999));
    } else {
      const now = new Date();
      switch (currentTimeRange) {
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case "3month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case "6month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        default:
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          break;
      }
    }

    // Filter by city and date range
    const filtered = reports.filter(r => {
      if (currentCity && r.area !== currentCity) return false;
      if (r.deleted) return false;
      const ts = r.timestamp;
      if (ts < startDate.getTime()) return false;
      if (ts > endDate.getTime()) return false;
      return true;
    });

    // Calculate stats
    const newStats: Stats = {
      total: filtered.length,
      open: filtered.filter(r => r.status === "open").length,
      pending: filtered.filter(r => r.status === "pending").length,
      inProgress: filtered.filter(r => r.status === "in progress").length,
      resolved: filtered.filter(r => r.status === "resolved").length,
    };

    setStats(newStats);
    setLoading(false);
  }, []);

  // Real-time subscription for stats updates
  useEffect(() => {
    if (!open) return;

    const unsubscribe = subscribeToReports((data) => {
      const all: Report[] = [];

      Object.entries(data).forEach(([type, group]) => {
        Object.entries(group as Record<string, Omit<Report, "type" | "id">>).forEach(
          ([id, r]) => {
            all.push({ ...r, type, id } as Report);
          }
        );
      });

      setAllReports(all);
      calculateStatsFromReports(all);
    });

    return () => unsubscribe();
  }, [open, calculateStatsFromReports]);
  
  // Recalculate stats when time range or dates change
  useEffect(() => {
    if (!open || allReports.length === 0) return;
    calculateStatsFromReports(allReports);
  }, [timeRange, fromDate, toDate, city, open, allReports, calculateStatsFromReports]);

  // Also load resolution time data (this can stay as API call)
  useEffect(() => {
    if (!open) return;
    
    async function load() {
      await loadResolutionData();
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, timeRange]);

  async function loadResolutionData() {
    let startDate: Date;
    let endDate: Date = new Date();

    if (timeRange === "custom") {
      if (!fromDate || !toDate) return;
      startDate = new Date(fromDate);
      endDate = new Date(new Date(toDate).setHours(23, 59, 59, 999));
    } else {
      const now = new Date();
      switch (timeRange) {
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case "3month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case "6month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        default:
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          break;
      }
    }

    let resolutionData = await fetchResolutionTimeData(timeRange, startDate, endDate);

    const monthOrder = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    resolutionData = resolutionData.sort(
      (a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
    );

    setTimeToResolveData(resolutionData);
  }

  const loadStats = () => {
    loadResolutionData();
  };

  const resolvedCount = stats.total - (stats.open + stats.pending + stats.inProgress);
  const openPercent = stats.total ? ((stats.open / stats.total) * 100).toFixed(1) : "0";
  const pendingPercent = stats.total ? ((stats.pending / stats.total) * 100).toFixed(1) : "0";
  const inProgressPercent = stats.total ? ((stats.inProgress / stats.total) * 100).toFixed(1) : "0";
  const resolvedPercent = stats.total ? ((resolvedCount / stats.total) * 100).toFixed(1) : "0";
  if (!open) return null;




  
  return (
    <Modal title=" " onClose={onClose}>
      <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-lg max-h-[85vh] overflow-y-auto w-[950px]">
        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📈 {t("statistics.analyticsDashboard")}
        </h1>
        <RealtimeClock />
 {/* 🔹 בורר זמן */}
<div className="text-center mb-6">
  <label className="mr-2 font-semibold">{t("statistics.timeRange")}:</label>

  <select
    className="border border-gray-300 rounded-md px-3 py-1"
    value={timeRange}
    onChange={(e) => {
      const val = e.target.value as
        | "month"
        | "3month"
        | "6month"
        | "year"
        | "custom";
      setTimeRange(val);

      // אם עברו למצב custom – לאפס תאריכים קודמים
      if (val !== "custom") {
        setFromDate("");
        setToDate("");
      }
    }}
  >
    <option value="month">{t("statistics.lastMonth")}</option>
    <option value="3month">{t("statistics.last3Months")}</option>
    <option value="6month">{t("statistics.last6Months")}</option>
    <option value="year">{t("statistics.lastYear")}</option>
    <option value="custom">{t("statistics.customRange")}</option>
  </select>

  {/* 🔸 אם נבחר custom – הצג שדות תאריך */}
  {timeRange === "custom" && (
    <div className="mt-3 flex justify-center gap-2 items-center">
      <label>{t("common.from")}:</label>
      <input
        type="date"
        dir="ltr"
        className="border border-gray-300 rounded-md px-2 py-1"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
      />
      <label>{t("common.to")}:</label>
      <input
        type="date"
        dir="ltr"
        className="border border-gray-300 rounded-md px-2 py-1"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
      />
      <button
        onClick={loadStats}
        className="ml-3 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        {t("common.apply")}
      </button>
    </div>
  )}
</div>

        {loading ? (
          <p className="text-center text-gray-500">{t("statistics.loadingStatistics")}</p>
        ) : (
          <>
            {/* 🔹 Stats Cards with Gradient */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90">📦 {t("statistics.totalReports")}</p>
                    <p className="text-4xl font-bold mt-2">{stats.total}</p>
                  </div>
                  <div className="text-5xl opacity-40">📊</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90">🟢 {t("statistics.openReports")} ({openPercent}%)</p>
                    <p className="text-4xl font-bold mt-2">{stats.open}</p>
                  </div>
                  <div className="text-5xl opacity-40">⏳</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90">🟡 {t("statistics.pendingReports")} ({pendingPercent}%)</p>
                    <p className="text-4xl font-bold mt-2">{stats.pending}</p>
                  </div>
                  <div className="text-5xl opacity-70">⚡</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90">🟠 {t("statistics.inProgressReports")} ({inProgressPercent}%)</p>
                    <p className="text-4xl font-bold mt-2">{stats.inProgress}</p>
                  </div>
                  <div className="text-5xl opacity-15">🔄</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-teal-400 to-teal-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90">✅ {t("statistics.resolvedReports")} ({resolvedPercent}%)</p>
                    <p className="text-4xl font-bold mt-2">{resolvedCount}</p>
                  </div>
                  <div className="text-5xl opacity-40">✓</div>
                </div>
              </div>
            </div>

            {/* 🔹 Resolution Time Chart */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-4 border-green-500">
              <h3 className="text-center font-bold text-lg mb-4 text-gray-800">
                ⏱️ {t("statistics.avgTimeToResolve")}
              </h3>


              <div className="h-[280px] bg-gradient-to-br from-gray-50 to-green-50 rounded-lg p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeToResolveData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis label={{ value: "Days", angle: -90, position: "insideLeft" }} stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#f3f4f6", border: "2px solid #3b82f6", borderRadius: "8px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="days"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 6, fill: "#1e40af" }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
        

        {/* Action Buttons Explanations */}
        <div className="flex gap-3 justify-center flex-wrap mb-2">
          <div className="text-xs text-gray-600 bg-blue-50 rounded px-2 py-1 w-[200px] text-center">
            <b> {t("statistics.openGraphs")}:</b> {t("statistics.openGraphsDesc")}
          </div>
          <div className="text-xs text-gray-600 bg-purple-50 rounded px-2 py-1 w-[200px] text-center">
            <b> {t("statistics.detailedStats")}:</b> {t("statistics.detailedStatsDesc")}
          </div>
          <div className="text-xs text-gray-600 bg-indigo-50 rounded px-2 py-1 w-[200px] text-center">
            <b> {t("statistics.statusTransitions")}:</b> {t("statistics.statusTransitionsDesc")}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => setGraphsModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            📊 {t("statistics.openGraphs")}
          </button>
          <button
            onClick={() => setDetailedOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            📈 {t("statistics.detailedStats")}
          </button>
          <button
            onClick={() => setOpenStatusTransition(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            ⏱️ {t("statistics.statusTransitions")}
          </button>

        </div>
        {graphsModalOpen && (
        <GraphsModal open={graphsModalOpen} onClose={() => setGraphsModalOpen(false)} />
        )}
      {detailedOpen && (
        <DetailedStatsModal
          open={detailedOpen}
          onClose={() => setDetailedOpen(false)}
          timeRange={timeRange}
          fromDate={fromDate}
          toDate={toDate}
        />
      )}
      </div>
      <StatusTransitionModal
        open={openStatusTransition}
        onClose={() => setOpenStatusTransition(false)}
        city={city}
      />
      
    </Modal>

    
  );
  
}
