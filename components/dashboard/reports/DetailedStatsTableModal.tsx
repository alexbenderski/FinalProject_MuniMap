"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/dashboard/common/Modal";
import { fetchReports } from "@/lib/client/fetchers";
import { Report as DBReport, TimeRange } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

interface DetailedStatsTableModalProps {
  open: boolean;
  onClose: () => void;
  type: "areas" | "unresolved" | "areasByResolve" | "categoriesByResolve";
  timeRange: TimeRange;
  fromDate?: string;
  toDate?: string;
}

interface AggregatedRow {
  name: string;
  total: number;
  resolved: number;
  unresolved: number;
  avgResolveDays?: number;
  medianResolveDays?: number;
  pending?: number;
  inProgress?: number;
  oldestOpenDays?: number;
  lastReportDate?: string;
  resolvedPercent?: number;
    resolveTimes: number[]; 

}

export default function DetailedStatsTableModal({
  open,
  onClose,
  type,
  timeRange,
  fromDate,
  toDate,
}: DetailedStatsTableModalProps) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<AggregatedRow[]>([]);
  const [loading, setLoading] = useState(true);

  type SortKey =
    | "name"
    | "total"
    | "resolved"
    | "unresolved"
    | "resolvedPercent"
    | "avgResolveDays"
    | "oldestOpenDays"
    | "lastReportDate"
    | "pending"
    | "inProgress"
    | "medianResolveDays"




  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
const [sortKey, setSortKey] = useState<keyof AggregatedRow | null>(null);

function onSort(key: keyof AggregatedRow) {
  if (sortKey === key) {
    // אותו עמודה → הופכים כיוון
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  } else {
    // עמודה חדשה → מתחילים בירידה
    setSortKey(key);
    setSortDir("desc");
  }
}



  useEffect(() => {
    if (!open) return;
    loadReports();
  }, [open, timeRange, type, fromDate, toDate]);

  async function loadReports() {
    setLoading(true);
    const data = await fetchReports();
    if (!data) {
      setRows([]);
      setLoading(false);
      return;
    }

    const allReports = Object.values(data).flatMap((group) =>
      Object.values(group as Record<string, DBReport>)
    ) as DBReport[];

  const activeReports = allReports.filter((r) => !r.deleted);


    // ✅ חישוב טווח כמו במסך הראשי
    const now = Date.now();
    let start: number;
    let end: number;

    if (timeRange === "custom" && fromDate && toDate) {
      start = new Date(fromDate).getTime();
      end = new Date(toDate).setHours(23, 59, 59, 999);
    } else {
      const rangeDays: Record<Exclude<TimeRange, "custom">, number> = {
        month: 30,
        "3month": 90,
        "6month": 180,
        year: 365,
      };
      const days = rangeDays[timeRange as Exclude<TimeRange, "custom">];
      start = now - days * 24 * 60 * 60 * 1000;
      end = now;
    }

    const filtered = activeReports.filter(
      (r) => r.timestamp && r.timestamp >= start && r.timestamp <= end
    );

    const aggregated: Record<string, AggregatedRow> = {};

    for (const r of filtered) {
      const key =
        type === "categoriesByResolve"
          ? r.type || "Other"
          : r.area || "Unknown";

    if (!aggregated[key]) {
      aggregated[key] = {
        name: key,
        total: 0,
        resolved: 0,
        unresolved: 0,
        pending: 0,
        inProgress: 0,
        avgResolveDays: 0,
        medianResolveDays: 0,
        oldestOpenDays: 0,
        resolvedPercent: 0,
        lastReportDate: "",
        resolveTimes: [], 
      } as AggregatedRow & { resolveTimes: number[] };
    }

      const a = aggregated[key];
      a.total++;

      const status = r.status?.toLowerCase() || "unknown";
      if (status === "resolved") a.resolved++;
      else if (status === "pending") a.pending!++;
      else if (status === "in progress") a.inProgress!++;
      else a.unresolved!++;

      // ממוצע וזמן סגירה
      if (
        typeof r.resolvedAt === "number" &&
        typeof r.timestamp === "number" &&
        status === "resolved"
      ) {
        const days = (r.resolvedAt - r.timestamp) / (1000 * 60 * 60 * 24);
        if (!isNaN(days) && days > 0) {
          a.resolveTimes.push(days);
        }
      }

      // תאריך אחרון
      if (!a.lastReportDate || r.timestamp > new Date(a.lastReportDate).getTime()) {
        a.lastReportDate = new Date(r.timestamp).toLocaleDateString("he-IL");
      }

      // 🔹 חישוב הדיווח הפתוח הישן ביותר
    if (status !== "resolved") {
      const daysOpen = (now - r.timestamp) / (1000 * 60 * 60 * 24);
      if (!a.oldestOpenDays || daysOpen > a.oldestOpenDays) {
        a.oldestOpenDays = Math.floor(daysOpen);
      }
    }
    }

 for (const key in aggregated) {
  const a = aggregated[key];
  if (a.resolveTimes.length > 0) {
    // ממוצע
    const sum = a.resolveTimes.reduce((acc, val) => acc + val, 0);
    a.avgResolveDays = +(sum / a.resolveTimes.length).toFixed(1);

    // חציון
    const sorted = [...a.resolveTimes].sort((x, y) => x - y);
    const mid = Math.floor(sorted.length / 2);
    a.medianResolveDays =
      sorted.length % 2 === 0
        ? +(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1))
        : +(sorted[mid].toFixed(1));
  } else {
    a.avgResolveDays = 0;
    a.medianResolveDays = 0;
  }
}



    // ✅ הפקה סופית של הרשומות
    const rowsFinal: AggregatedRow[] = Object.values(aggregated).map((a) => ({
      ...a,
      resolvedPercent: a.total ? +(100 * (a.resolved / a.total)).toFixed(1) : 0,
    }));




    // מיון לפי סוג
    const sorted = rowsFinal;
    if (type === "areas") sorted.sort((a, b) => b.total - a.total);
    else if (type === "unresolved")
      sorted.sort(
        (a, b) =>
          (b.unresolved / Math.max(1, b.total)) -
          (a.unresolved / Math.max(1, a.total))
      );
    else if (type === "areasByResolve" || type === "categoriesByResolve")
      sorted.sort((a, b) => (b.avgResolveDays ?? 0) - (a.avgResolveDays ?? 0));

    setRows(sorted);
    setLoading(false);
  }

  if (!open) return null;

const th = (label: string, key: SortKey) => (
  <th
    className="text-left px-2 cursor-pointer select-none"
    onClick={() => onSort(key)}
  >
    {label}
    {sortKey === key && (sortDir === "asc" ? " ▲" : " ▼")}
  </th>
);

const renderColumns = () => {
  switch (type) {
    case "areas":
      return (
        <>
          {th(t("detailedStats.area"), "name")}
          {th(t("detailedStats.total"), "total")}
          {th(t("detailedStats.resolved"), "resolved")}
          {th(t("detailedStats.pending"), "pending")}
          {th(t("detailedStats.inProgress"), "inProgress")}
          {th(t("detailedStats.unresolved"), "unresolved")}
          {th(t("detailedStats.percentResolved"), "resolvedPercent")}
          {th(t("detailedStats.avgResolveDays"), "avgResolveDays")}
        </>
      );

    case "unresolved":
      return (
        <>
          {th(t("detailedStats.area"), "name")}
          {th(t("detailedStats.total"), "total")}
          {th(t("detailedStats.unresolved"), "unresolved")}
          {th(t("detailedStats.unresolvedPercent"), "resolvedPercent")}
          {th(t("detailedStats.oldestReportDays"), "oldestOpenDays")}
          {th(t("detailedStats.avgDaysOpen"), "avgResolveDays")}
        </>
      );

    case "areasByResolve":
      return (
        <>
          {th(t("detailedStats.area"), "name")}
          {th(t("detailedStats.total"), "total")}
          {th(t("detailedStats.resolved"), "resolved")}
          {th(t("detailedStats.avgResolveDays"), "avgResolveDays")}
          {th(t("detailedStats.percentResolved"), "resolvedPercent")}
          {th(t("detailedStats.medianResolve"), "medianResolveDays")}
        </>
      );

    case "categoriesByResolve":
      return (
        <>
          {th(t("detailedStats.category"), "name")}
          {th(t("detailedStats.total"), "total")}
          {th(t("detailedStats.resolved"), "resolved")}
          {th(t("detailedStats.unresolved"), "unresolved")}
          {th(t("detailedStats.percentResolved"), "resolvedPercent")}
          {th(t("detailedStats.avgResolveDays"), "avgResolveDays")}
        </>
      );
  }
};

  const renderRow = (r: AggregatedRow) => {
    switch (type) {
      case "areas":
        return (
          <>
            <td className="text-left px-2">{r.name}</td>
            <td className="text-left px-2">{r.total}</td>
            <td className="text-left px-2 text-green-600">{r.resolved}</td>
            <td className="text-left px-2">{r.pending}</td>
            <td className="text-left px-2">{r.inProgress}</td>
            <td className="text-left px-2 text-red-600">{r.unresolved}</td>
            <td className="text-left px-2  text-green-600">{r.resolvedPercent}%</td>
            <td className="text-left px-2">{r.avgResolveDays}</td>
          </>
        );
      case "unresolved":
        const unresolvedPercent =
          r.total > 0 ? ((r.unresolved / r.total) * 100).toFixed(1) : "0";
        return (
          <>
            <td className="text-left px-2">{r.name}</td>
            <td className="text-left px-2">{r.total}</td>
            <td className="text-left px-2 text-red-600" >{r.unresolved}</td>
            <td className="text-left px-2  text-red-600">{unresolvedPercent}%</td>
            <td className="text-left px-2">{r.oldestOpenDays ?? "—"}</td>
            <td className="text-left px-2">{r.avgResolveDays ?? "—"}</td>
          </>
        );
      case "areasByResolve":
        return (
          <>
            <td  className="text-left px-2">{r.name}</td>
            <td  className="text-left px-2">{r.total}</td>
            <td className="text-left px-2 text-green-600">{r.resolved}</td>
            <td  className="text-left px-2 ">{r.avgResolveDays ?? "—"}</td>
            <td  className="text-left px-2  text-green-600">{r.resolvedPercent}%</td>
            <td  className="text-left px-2">{r.medianResolveDays ?? "—"}</td>
          </>
        );
      case "categoriesByResolve":
  return (
    <>
      <td className="text-left px-2">{r.name}</td>
      <td className="text-left px-2">{r.total}</td>
      <td className="text-left px-2 text-green-600">{r.resolved}</td>
      <td className="text-left px-2 text-red-600">{r.unresolved}</td>
      <td className="text-left px-2  text-green-600">{r.resolvedPercent}%</td>
      <td className="text-left px-2">{r.avgResolveDays ?? "—"}</td>
    </>
  );
    }
  };

const sortedRows = [...rows].sort((a, b) => {
  if (!sortKey) return 0;

  const dir = sortDir === "asc" ? 1 : -1;

  const av = a[sortKey];
  const bv = b[sortKey];

  // // תאריך
  // if (sortKey === "lastReportDate") {
  //   const ta = av ? new Date(av as string).getTime() : 0;
  //   const tb = bv ? new Date(bv as string).getTime() : 0;
  //   return (ta - tb) * dir;
  // }

  // מספר
  if (typeof av === "number" && typeof bv === "number") {
    return (av - bv) * dir;
  }

  // טקסט
  return String(av ?? "").localeCompare(String(bv ?? ""), "he") * dir;
});
  
  return (
    <Modal
      title={`${t("detailedStats.details")} — ${
        type === "areas"
          ? t("detailedStats.areas")
          : type === "unresolved"
          ? t("detailedStats.unresolvedAreas")
          : type === "areasByResolve"
          ? t("detailedStats.areasByResolve")
          : t("detailedStats.categoriesByResolve")
      }`}
      onClose={onClose}
    >
      <div className="bg-white p-5 rounded-lg w-[1100px] max-h-[85vh] overflow-y-auto">
        {loading ? (
          <p className="text-center text-gray-500 py-5">{t("detailedStats.loadingData")}</p>
        ) : (
          <table className="min-w-full table-fixed border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>{renderColumns()}</tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-4 text-gray-500">
                    {t("detailedStats.noDataFound")}
                  </td>
                </tr>
              ) : (
                sortedRows.map((r, i) => (
                  <tr key={i} className="border-b">
                    {renderRow(r)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
