"use client";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Modal from "@/components/dashboard/Modal";
import { fetchReportsStats, fetchResolutionTimeData } from "@/lib/client/fetchers";
import GraphsModal from "@/components/dashboard/GraphsModal";
import DetailedStatsModal from "@/components/dashboard/DetailedStatsModal";
import { TimeRange } from "@/lib/types";
import StatusTransitionModal from "@/components/dashboard/StatusTransitionModal";

type Stats = {
  total: number;
  open: number;
  pending: number;
  inProgress: number;
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
  const [stats, setStats] = useState<Stats>({
    total: 0,
    open: 0,
    pending: 0,
    inProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeToResolveData, setTimeToResolveData] = useState<{ month: string; days: number }[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [graphsModalOpen, setGraphsModalOpen] = useState(false);
  const [detailedStatsOpen, setDetailedStatsOpen] = useState(false);
  const [detailedOpen, setDetailedOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [openStatusTransition, setOpenStatusTransition] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadStats();
  }, [open, timeRange]);

async function loadStats() {
  setLoading(true);
 
  // נחשב טווח תאריכים לפי הבחירה
  let startDate: Date;
  let endDate: Date = new Date();

  if (timeRange === "custom") {
    if (!fromDate || !toDate) { setLoading(false); return; }
    startDate = new Date(fromDate);
    endDate = new Date(new Date(toDate).setHours(23,59,59,999));
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





  // טוען נתונים מהמסד עם סינון לפי תאריכים
  const data = await fetchReportsStats(timeRange, startDate, endDate);
  let resolutionData = await fetchResolutionTimeData(timeRange, startDate, endDate);

  // ✅ סידור החודשים לפי סדר כרונולוגי
  const monthOrder = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  resolutionData = resolutionData.sort(
    (a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
  );

  setStats(data);
  setTimeToResolveData(resolutionData);
  setLoading(false);
}

  const openPercent = stats.total ? ((stats.open / stats.total) * 100).toFixed(1) : "0";
  const pendingPercent = stats.total ? ((stats.pending / stats.total) * 100).toFixed(1) : "0";
  const inProgressPercent = stats.total ? ((stats.inProgress / stats.total) * 100).toFixed(1) : "0";

  if (!open) return null;




  
  return (
    <Modal title="📊 Statistics & Analysis Hub" onClose={onClose}>
      <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-lg max-h-[85vh] overflow-y-auto w-[950px]">
        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📈 Analytics Dashboard
        </h1>

 {/* 🔹 בורר זמן */}
<div className="text-center mb-6">
  <label className="mr-2 font-semibold">Time Range:</label>

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
    <option value="month">Last Month</option>
    <option value="3month">Last 3 Months</option>
    <option value="6month">Last 6 Months</option>
    <option value="year">Last Year</option>
    <option value="custom">Custom Range</option>
  </select>

  {/* 🔸 אם נבחר custom – הצג שדות תאריך */}
  {timeRange === "custom" && (
    <div className="mt-3 flex justify-center gap-2 items-center">
      <label>From:</label>
      <input
        type="date"
        className="border border-gray-300 rounded-md px-2 py-1"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
      />
      <label>To:</label>
      <input
        type="date"
        className="border border-gray-300 rounded-md px-2 py-1"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
      />
      <button
        onClick={loadStats}
        className="ml-3 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Apply
      </button>
    </div>
  )}
</div>

        {loading ? (
          <p className="text-center text-gray-500">Loading statistics...</p>
        ) : (
          <>
            {/* 🔹 Stats Cards with Gradient */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90">📦 Total Reports</p>
                    <p className="text-4xl font-bold mt-2">{stats.total}</p>
                  </div>
                  <div className="text-5xl opacity-20">📊</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90">🟢 Open ({openPercent}%)</p>
                    <p className="text-4xl font-bold mt-2">{stats.open}</p>
                  </div>
                  <div className="text-5xl opacity-20">⏳</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90">🟡 Pending ({pendingPercent}%)</p>
                    <p className="text-4xl font-bold mt-2">{stats.pending}</p>
                  </div>
                  <div className="text-5xl opacity-20">⚡</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-90">🟠 In Progress ({inProgressPercent}%)</p>
                    <p className="text-4xl font-bold mt-2">{stats.inProgress}</p>
                  </div>
                  <div className="text-5xl opacity-20">🔄</div>
                </div>
              </div>
            </div>

            {/* 🔹 Resolution Time Chart */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-l-4 border-green-500">
              <h3 className="text-center font-bold text-lg mb-4 text-gray-800">
                ⏱️ Average Time to Resolve (days)
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

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => setGraphsModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            📊 Open Graphs
          </button>
          <button
            onClick={() => setDetailedOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            📈 Detailed Stats
          </button>
          <button
            onClick={() => setOpenStatusTransition(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            ⏱️ Status Transitions
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            ✕ Close
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
