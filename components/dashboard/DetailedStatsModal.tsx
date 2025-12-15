"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/dashboard/Modal";
import { fetchDetailedStatistics } from "@/lib/client/fetchers";
import { DetailedStats, AreaStats, CategoryStats,TimeRange } from "@/lib/types";
import DetailedStatsTableModal from "@/components/dashboard/DetailedStatsTableModal";

export default function DetailedStatsModal({
  open,
  onClose,
  timeRange,
  fromDate,
  toDate,
}: {
  open: boolean;
  onClose: () => void;
  timeRange: TimeRange;
  fromDate?: string;
  toDate?: string;
}) {
  const [data, setData] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableOpen, setTableOpen] = useState<"areas" | "unresolved" | "areasByResolve" | "categoriesByResolve" | null>(null); // 👈 איזה טבלה פתוחה
  const [tableType, setTableType] = useState<string | null>(null);

  useEffect(() => {
      async function loadStats() {
    setLoading(true);
    const stats = await fetchDetailedStatistics(timeRange, fromDate, toDate);
    setData(stats);
    setLoading(false);
  }
    if (!open) return;
    loadStats();
  }, [open, timeRange, fromDate, toDate, ]);



  if (!open) return null;


function formatTimeRange(
  timeRange: TimeRange,
  fromDate?: string,
  toDate?: string
) {
  switch (timeRange) {
    case "month":
      return "Last Month";
    case "3month":
      return "Last 3 Months";
    case "6month":
      return "Last 6 Months";
    case "year":
      return "Last Year";
    case "custom":
      return fromDate && toDate
        ? `Custom: ${fromDate} → ${toDate}`
        : "Custom Range";
    default:
      return "";
  }
}


  return (
    <Modal title="Detailed Area & Category Statistics" onClose={onClose}>
<div className="bg-white p-5 rounded-lg w-[900px] h-full overflow-hidden">
        <h2 className="text-xl font-bold text-center mb-6">📊 Detailed Statistics Overview</h2>
      <p className="text-center text-sm text-gray-600 mb-6">
        Time Range:{" "}
        <span className="font-semibold">
          {formatTimeRange(timeRange, fromDate, toDate)}
        </span>
      </p>
        {loading ? (
          <p className="text-center text-gray-500">Loading data...</p>
        ) : !data ? (
          <p className="text-center text-gray-500">No data available</p>
        ) : (
          <>
{/* 🔹 Breakdown by Area */}
<div className="grid grid-cols-2 gap-6 mb-6">

  {/* Top Areas by Number of Reports */}
<div className="bg-gray-50 p-4 rounded-md h-[220px] flex flex-col">
  <div className="flex justify-between items-center mb-2 shrink-0">
    <h3 className="font-semibold text-lg underline">
        Top Areas by Number of Reports
      </h3>
      <button
        className="text-blue-600 hover:underline text-sm"
        onClick={() => setTableOpen("areas")}
      >
        Open Table
      </button>
    </div>

  <div className="flex-1 overflow-y-auto min-h-0">
      <ul className="text-sm space-y-1 pr-1">
        {data?.topAreas?.map((a, i) => (
          <li key={i}>
            {a.area} — {a.total}
          </li>
        ))}
      </ul>
    </div>
  </div>

  {/* Top Unresolved Areas (%) */}
<div className="bg-gray-50 p-4 rounded-md h-[220px] flex flex-col min-h-0">
  <div className="flex justify-between items-center mb-2 shrink-0">
      <h3 className="font-semibold text-lg underline">
        Top Unresolved Areas (%)
      </h3>
      <button
        className="text-blue-600 hover:underline text-sm"
        onClick={() => setTableOpen("unresolved")}
      >
        Open Table
      </button>
    </div>

  <div className="flex-1 overflow-y-auto min-h-0">
      <ul className="text-sm space-y-1 pr-1">
        {data?.topUnresolvedAreas?.map((a, i) => (
          <li key={i}>
            {a.area} — {a.unresolvedPercent}%
          </li>
        ))}
      </ul>
    </div>
  </div>
</div>

{/* 🔹 Breakdown by Resolve Time */}
<div className="grid grid-cols-2 gap-6 mb-6">

  {/* Top Areas by Avg Resolve Time */}
<div className="bg-gray-50 p-4 rounded-md h-[220px] flex flex-col min-h-0">
  <div className="flex justify-between items-center mb-2 shrink-0">
      <h3 className="font-semibold text-lg underline">
        Top Areas by Avg Resolve Time
      </h3>
      <button
        className="text-blue-600 hover:underline text-sm"
        onClick={() => setTableOpen("areasByResolve")}
      >
        Open Table
      </button>
    </div>

  <div className="flex-1 overflow-y-auto min-h-0">
      <ul className="text-sm space-y-1 pr-1">
        {data?.topAreasByResolveTime?.map((a, i) => (
          <li key={i}>
            {a.area} — {a.avgResolveDays}d
          </li>
        ))}
      </ul>
    </div>
  </div>

  {/* Top Categories by Avg Resolve Time */}
<div className="bg-gray-50 p-4 rounded-md h-[220px] flex flex-col min-h-0">
  <div className="flex justify-between items-center mb-2 shrink-0">
      <h3 className="font-semibold text-lg underline">
        Top Categories by Avg Resolve Time
      </h3>
      <button
        className="text-blue-600 hover:underline text-sm"
        onClick={() => setTableOpen("categoriesByResolve")}
      >
        Open Table
      </button>
    </div>

  <div className="flex-1 overflow-y-auto min-h-0">
      <ul className="text-sm space-y-1 pr-1">
        {data?.topCategoriesByResolveTime?.map((c, i) => (
          <li key={i}>
            {c.category} — {c.avgResolveDays}d
          </li>
        ))}
      </ul>
    </div>
  </div>
</div>

          </>
        )}

        {/* 🔹 כפתור סגירה */}
        <button
          onClick={onClose}
          className="mt-3 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 block mx-auto"
        >
          Close
        </button>

        {/* 🔹 חלון טבלה */}

        {/* {tableType && (
        <DetailedStatsTableModal
          open={!!tableType}
          onClose={() => setTableType(null)}
          type={tableType}
          timeRange={timeRange} 
        />
        )} */}
                {tableOpen && (
          <DetailedStatsTableModal
            open={!!tableOpen}
            onClose={() => setTableOpen(null)}
            type={tableOpen}
            timeRange={timeRange}  
            fromDate={fromDate}
            toDate={toDate}   
          />
        )}
      </div>
    </Modal>
  );
}
