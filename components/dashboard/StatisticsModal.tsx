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
import { fetchReportsStats, fetchResolutionTimeData } from "@/lib/fetchers";
import GraphsModal from "@/components/dashboard/GraphsModal";
import DetailedStatsModal from "@/components/dashboard/DetailedStatsModal";
import { TimeRange } from "@/lib/types";


type Stats = {
  total: number;
  open: number;
  pending: number;
  inProgress: number;
};

export default function StatisticsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
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
    <Modal title="Statistics reports and Analysis" onClose={onClose}>
      <div className="p-4 bg-white rounded-lg max-h-[85vh] overflow-y-auto w-[950px]">
        <h1 className="text-2xl font-bold text-center mb-6 underline">
          Statistics reports and Analysis
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
            {/* 🔹 ארבעת המדדים באותה שורה */}
            <div className="grid grid-cols-4 gap-4 mb-6 text-center">
              <div className="bg-gray-50 p-4 rounded-md">
                <h2 className="font-semibold text-lg">Total Reports</h2>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <h2 className="font-semibold text-lg">%Open</h2>
                <p className="text-3xl font-bold mt-2 text-blue-700">{openPercent}%</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <h2 className="font-semibold text-lg">%Pending</h2>
                <p className="text-3xl font-bold mt-2 text-yellow-600">{pendingPercent}%</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <h2 className="font-semibold text-lg">%In Progress</h2>
                <p className="text-3xl font-bold mt-2 text-orange-600">{inProgressPercent}%</p>
              </div>
            </div>

            {/* 🔹 גרף זמן פתרון אמיתי */}
            <div className="bg-gray-50 p-5 rounded-md mb-6">
              <h3 className="text-center font-semibold text-lg mb-2">
                Average Time to Resolve (days)
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeToResolveData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: "Days", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="days"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        <button
            onClick={() => setGraphsModalOpen(true)}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 block mx-auto"
            >
            Open Graphs Dashboard 📊
        </button>
        <button
        onClick={() => setDetailedOpen(true)}
            className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 block mx-auto"
            >
            Open Detailed Statistics 📈
        </button>



        <button
          onClick={onClose}
          className="mt-3 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 block mx-auto"
        >
          Close
        </button>
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

    </Modal>
  );
  
}
