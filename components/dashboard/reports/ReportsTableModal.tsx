"use client";
import { useEffect, useState, useMemo } from "react";
import Modal from "@/components/dashboard/common/Modal";
import FiltersModal from "@/components/dashboard/common/FiltersModal";
import { subscribeToReports, deleteReport } from "@/lib/client/fetchers";
import { Report, Anomaly } from "@/lib/types";
import ReportsMapModal from "@/components/dashboard/maps/ReportsMapModal";
import ReportDetailsModal from "@/components/dashboard/reports/ReportDetailsModal";
import { getCurrentUserInfo } from "@/lib/client/fetchers";
import Image from "next/image";
import { getReportCriticalityType } from "@/lib/server/sla";
import Tooltip from "../common/Tooltip";
import { useLanguage } from "@/lib/i18n";

interface Props {
  timestamp: number;
  type: string;
}



interface ReportsTableModalProps {
  open: boolean;
  onClose: () => void;
  reports?: Report[];
  selectedArea: string | null;
  onApplyFilters: (filters: FiltersPayload) => void; // 👈  — כדי לעדכן גם את המפה
  title?: string;               
  anomalyDetails?: Anomaly; // 👈 חדש — מוסיף את פרטי האנומליה
  onReviewUpdate?: (updatedAnomaly: Anomaly) => void;
  initialFilters?: FiltersPayload; // 👈 חדש — מסננים התחלתיים מה-dashboard
  }

type FiltersPayload = {
  categories: string[];
  location: string;
  status: "open" | "pending" | "in progress" | "resolved" | "all";
  statusList?: string[]; // 👈 חדש — רשימת סטטוסים
  mediaOnly: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  criticality?: string;
  criticalityList?: string[]; // 👈 חדש — רשימת קריטיות
};




export default function ReportsTableModal({
  open,
  onClose,
  reports: externalReports,
  selectedArea, 
  onApplyFilters,
  title,
  anomalyDetails,
  onReviewUpdate,
  initialFilters,
}: ReportsTableModalProps) {
/////////////////////////////////////////////////////////////////consts://///////////////////////
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<Report[]>([]);
  const [anomalyRows, setAnomalyRows] = useState<Report[]>([]);

  // 🔹 מסנן רק את הדיווחים ששייכים לאנומליה
useEffect(() => {
  if (!anomalyDetails || rows.length === 0) {
    setAnomalyRows([]);
    return;
  }

  const ids = new Set(anomalyDetails.relatedReports);

  const filtered = rows.filter((r) => r.id && ids.has(r.id));

  setAnomalyRows(filtered);
}, [anomalyDetails, rows]);


  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [searchId, setSearchId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FiltersPayload>(() => {
    // 👈 אתחול עם הסינונים מה-dashboard אם קיימים
    if (initialFilters) {
      return {
        categories: initialFilters.categories || [],
        location: initialFilters.location || "",
        status: initialFilters.status || "all",
        statusList: initialFilters.statusList || [],
        mediaOnly: initialFilters.mediaOnly || false,
        dateFrom: initialFilters.dateFrom ?? null,
        dateTo: initialFilters.dateTo ?? null,
        criticality: initialFilters.criticality || "",
        criticalityList: initialFilters.criticalityList || [],
      };
    }
    return {
      categories: [],
      location: "",
      status: "all",
      statusList: [],
      mediaOnly: false,
      dateFrom: null,
      dateTo: null,
      criticality: "",
      criticalityList: [],
    };
  });
  const [mapOpen, setMapOpen] = useState(false);
  const [reportsToShow, setReportsToShow] = useState<Report[]>([]);
  // 🔍 שליטה על פתיחת חלון הפרטים
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [localAnomaly, setLocalAnomaly] = useState(anomalyDetails);
  const [anomalyDetailsOpen, setAnomalyDetailsOpen] = useState(true);
  const { safeKey: currentUserKey } = getCurrentUserInfo();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [generatedCleanLink, setGeneratedCleanLink] = useState("");
  const [fieldWorkerModalOpen, setFieldWorkerModalOpen] = useState(false);
  const [fieldWorkerReports, setFieldWorkerReports] = useState<Report[]>([]);
  // 🧭 ניהול מיון
  const [sortColumn, setSortColumn] = useState<string>(""); 
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // ✅ Sync localAnomaly when anomalyDetails changes
  useEffect(() => {
    if (anomalyDetails) {
      setLocalAnomaly(anomalyDetails);
    }
  }, [anomalyDetails]);
  
  const handleOpenDetails = (report: Report) => {
    console.log("Opening details for:", report.id, report.type);
    setSelectedReport(report);
    setDetailsOpen(true);
  };







function CriticalityCell({ timestamp, type }: Props) {
  // מייצרים אובייקט "report" מלא רק עם מה שפונקציית ה-SLA צריכה
const fakeReport: Partial<Report> = {
  timestamp,
  type,
};

  // ← כאן שינינו! עכשיו משתמשים ב-SLA האמיתי
 const crit = getReportCriticalityType(fakeReport as Report);// מחזיר: "green" | "yellow" | "orange" | "red"

  const icon = `/icons/${crit}_${type}.png`;

  const levelKey =
    crit === "green"  ? "criticality.new" :
    crit === "yellow" ? "criticality.medium" :
    crit === "orange" ? "criticality.old" :
    "criticality.critical";

  const { t } = useLanguage();
  const level = t(levelKey);

  const [imgSrc, setImgSrc] = useState(icon);

  // Color map for better contrast
  const colorMap: Record<string, { bg: string; text: string }> = {
    green: { bg: "bg-green-100", text: "text-green-800" },
    yellow: { bg: "bg-yellow-100", text: "text-yellow-900" }, // Dark text for yellow background
    orange: { bg: "bg-orange-100", text: "text-orange-800" },
    red: { bg: "bg-red-100", text: "text-red-800" },
  };

  const colors = colorMap[crit] || { bg: "bg-gray-100", text: "text-gray-800" };

  return (
    <div className="flex flex-col items-center justify-center">
      <Image
        src={imgSrc}
        alt={level}
        width={24}
        height={24}
        onError={() => setImgSrc(`/icons/${crit}_default.png`)}
        unoptimized
      />
      <span className={`px-2 py-1 rounded text-xs font-bold ${colors.bg} ${colors.text}`}>
        {level}
      </span>
    </div>
  );
}





// 🧩 פונקציה לחישוב ערך מיון לפי שדה
function getSortValue(r: Report, column: string) {
  switch (column) {
    case "Category":
      return r.type?.toLowerCase() || "";
    case "Description":
      return r.description?.toLowerCase() || "";
    case "Location":
      return r.area?.toLowerCase() || "";
    case "Address":
      return r.address?.toLowerCase() || "";
    case "Timestamp":
      return r.timestamp;
    // case "Criticality": {
    //   const { level } = getReportCriticality(r.timestamp,  r.type ?? "default");
    //   const order = { חדש: 1, בינוני: 2, ישן: 3, קריטי: 4 };
    //   return order[level as keyof typeof order] || 5;
    // }
    case "Criticality": {
  const color = getReportCriticalityType(r); // "green" | "yellow" | "orange" | "red"
  const order = { green: 1, yellow: 2, orange: 3, red: 4 };
  return order[color as keyof typeof order] || 5;
}
    case "Status": {
      const order = { open: 1, pending: 2, "in progress": 3, resolved: 4 };
      return order[r.status as keyof typeof order] || 5;
    }
    case "Media":
      return r.media ? 1 : 0;
    default:
      return "";
  }
}

// 🧭 פונקציה שמחליפה סדר מיון
function handleSort(column: string) {
  if (sortColumn === column) {
    // אם כבר ממוין לפי העמודה הזו – הופכים כיוון
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  } else {
    setSortColumn(column);
    setSortDirection("asc");
  }
}



  // טוען דיווחים - Always use real-time subscription for live updates
  useEffect(() => {
    if (!open) return;

    // Always subscribe to real-time updates
    const unsubscribe = subscribeToReports((data) => {
      const all: Report[] = [];

      Object.entries(data).forEach(([type, group]) => {
        Object.entries(group).forEach(([id, report]) => {
          all.push({ ...report, type, id });
        });
      });

      setRows(all);
    });

    return () => unsubscribe();
  }, [open]);

  // Also update when external reports change (for filtered data from MapCanvas)
  useEffect(() => {
    if (externalReports && externalReports.length > 0) {
      // External reports are filtered, use them for display
      // But real-time subscription above will keep updating the full list
    }
  }, [externalReports]);


  
const filteredRows = useMemo(() => {
  // ⭐ במצב אנומליה — משתמשים רק בדיווחים שלה, ללא סינון כלל
  if (anomalyDetails) {
    return anomalyRows.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ⭐ בדיקה אם יש סינונים פעילים
  const hasFilters = 
    filters.categories.length > 0 ||
    filters.location ||
    (filters.statusList && filters.statusList.length > 0) ||
    (filters.status !== "all") ||
    filters.mediaOnly ||
    filters.dateFrom ||
    filters.dateTo ||
    (filters.criticalityList && filters.criticalityList.length > 0) ||
    filters.criticality;

  // ⭐ אם אין סינונים — לא מציגים דיווחים (כפי שביקש המשתמש)
  if (!hasFilters) {
    return [];
  }

  // ⭐ במצב רגיל — סינון רגיל
  return rows.filter((r) => {
    const categoryMatch =
      filters.categories.length === 0 ||
      filters.categories.includes(r.type ?? "");

    const locationMatch =
      !filters.location || r.area === filters.location;

    // ⭐ תמיכה ב-statusList (מרובה) או status (יחיד)
    const statusMatch =
      (filters.statusList && filters.statusList.length > 0)
        ? filters.statusList.includes(r.status ?? "")
        : filters.status === "all"
          ? true
          : r.status === filters.status;

    const mediaMatch =
      !filters.mediaOnly || r.media === true;

    const fromMs = filters.dateFrom
      ? new Date(filters.dateFrom).getTime()
      : null;

    const toMs = filters.dateTo
      ? new Date(filters.dateTo).getTime()
      : null;

    const timeMatch =
      (!fromMs || r.timestamp >= fromMs) &&
      (!toMs || r.timestamp <= toMs);

    const idMatch = searchId
      ? (r.id ?? "").toLowerCase().includes(searchId.toLowerCase())
      : true;

    // ⭐ תמיכה ב-criticalityList (מרובה) או criticality (יחיד)
    const reportCriticality = getReportCriticalityType(r);
    const criticalityMatch =
      (filters.criticalityList && filters.criticalityList.length > 0)
        ? filters.criticalityList.includes(reportCriticality)
        : !filters.criticality || reportCriticality === filters.criticality;
      
    return (
      categoryMatch &&
      locationMatch &&
      statusMatch &&
      mediaMatch &&
      timeMatch &&
      idMatch &&
      criticalityMatch   // ⭐ זה הקטע שגורם לפילטר לעבוד לפי SLA

    );
  });
}, [rows, anomalyRows, anomalyDetails, filters, searchId]);


// ✅ הוספת מיון לפני ההצגה
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    if (sortColumn) {
      sorted.sort((a, b) => {
        const valA = getSortValue(a, sortColumn);
        const valB = getSortValue(b, sortColumn);

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredRows, sortColumn, sortDirection]);



  // ✅ מזהה ייחודי לכל שורה
  const getRowId = (r: Report) =>
    r.id ?? `${r.type}-${r.timestamp}-${r.lat}-${r.lng}`;

  const toggleSelect = (id: string) =>
    setSelectedReports((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectAll = () => {
    const ids = sortedRows.map(getRowId);
    if (selectedReports.length === ids.length) setSelectedReports([]);
    else setSelectedReports(ids);
  };

async function handleDeleteSelection() {
  if (selectedReports.length === 0) {
    alert(t("reportsTable.noReportsSelected"));
    return;
  }

  const confirmDelete = confirm(t("reportsTable.deleteConfirm").replace("{count}", String(selectedReports.length)));
  if (!confirmDelete) return;

  for (const id of selectedReports) {
    const report = rows.find(r => r.id === id);
    if (report) {
      // Pass city (area) as third parameter
      await deleteReport(report.type ?? "", report.id ?? "", report.area ?? "");
    }
  }

  // הסרה גם מהטבלה המקומית
  setRows(rows.filter(r => !selectedReports.includes(r.id ?? "")));
  setSelectedReports([]);
  alert(t("reportsTable.deleteSuccess"));


}
  
async function handleGenerateDualLinks() {
  const selected = rows.filter((r) => selectedReports.includes(r.id ?? ""));
  if (selected.length < 2) {
    alert(t("reportsTable.selectTwoForRoute"));
    return;
  }

  // ✅ מנסה לקבל את המיקום הנוכחי של המשתמש דרך GPS
  const getUserLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(t("reportsTable.locationNotSupported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(t("reportsTable.locationDetectionFailed")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  let userLocation: { lat: number; lng: number } | null = null;
  try {
    userLocation = await getUserLocation();
    alert(t("reportsTable.locationAdded"));
  } catch (err) {
    console.warn(err);
    alert(err);
  }

  // ✅ נבנה רשימת נקודות לניווט — ללא GPS של המשתמש, כדי שהעובד יוכל לבחור את מיקומו בעצמו
  const routePoints: { lat: number; lng: number }[] = [];
  routePoints.push(...selected.map((r) => ({ lat: r.lat, lng: r.lng })));

  // --------------------------
  // 🔹 לינק נקי (ללא נקודת התחלה - העובד יבחר את מיקומו ידנית)
  const destinationClean = `${routePoints[routePoints.length - 1].lat},${routePoints[routePoints.length - 1].lng}`;
  const waypointsClean = routePoints
    .slice(0, -1)
    .map((p) => `${p.lat},${p.lng}`)
    .join("|");

  const cleanLink = waypointsClean
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        destinationClean
      )}&waypoints=${encodeURIComponent(
        waypointsClean
      )}&travelmode=driving&hl=he`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        destinationClean
      )}&travelmode=driving&hl=he`;

  // --------------------------
  // שמירה והעתקה
  setGeneratedCleanLink(cleanLink);
  navigator.clipboard.writeText(cleanLink);
  setLinkModalOpen(true);
}




return (
  <>
    <Modal title={title ?? t("reportsTable.title")} onClose={onClose}>
      <div className="flex flex-col bg-white rounded-lg shadow-lg max-w-[95vw] max-h-[90vh] w-[1200px] overflow-hidden">

{/* Anomaly Details Section - Collapsible */}
{localAnomaly && (
  <div className="border-b mb-3 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-l-red-500">
    {/* Collapsible Header */}
    <div className="px-6 pt-4 pb-3 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setAnomalyDetailsOpen(!anomalyDetailsOpen)}>
      <div className="flex items-center gap-2">
        <h2 className="font-bold text-lg text-red-700">
          🚨 {t("reportsTable.anomalyDetails")}
        </h2>
        <span className={`transform transition-transform duration-300 text-red-700 font-bold ${anomalyDetailsOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>

      {/* Mark as Reviewed Button */}
      <button
        onClick={async () => {
          if (!currentUserKey) {
            alert(t("reportsTable.noUserFound"));
            return;
          }

          const alreadyReviewed =
            !!localAnomaly.reviewedBy?.[currentUserKey];

          if (alreadyReviewed) {
            alert(t("reportsTable.alreadyReviewed"));
            return;
          }

          if (!confirm(t("reportsTable.confirmReview"))) return;

          try {
            const { markAnomalyAsReviewed } = await import("@/lib/client/fetchers");
            const result = await markAnomalyAsReviewed(localAnomaly);

            if (result.alreadyReviewed) {
              alert(t("reportsTable.alreadyReviewed"));
              return;
            }

            const updatedAnomaly = {
              ...localAnomaly,
              reviewedBy: {
                ...(localAnomaly.reviewedBy ?? {}),
                [currentUserKey]: result.timestamp ?? Date.now(),
              },
            };

            setLocalAnomaly(updatedAnomaly);

            if (onReviewUpdate) {
              onReviewUpdate(updatedAnomaly);
            }

            alert(t("reportsTable.markedAsReviewed").replace("{email}", result.email ?? ""));
          } catch (err) {
            console.error("Error marking as reviewed:", err);
            alert(t("reportsTable.reviewFailed").replace("{error}", err instanceof Error ? err.message : 'Unknown error'));
          }
        }}
        className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
          currentUserKey && localAnomaly.reviewedBy?.[currentUserKey]
            ? "bg-green-200 text-green-800 border-2 border-green-400 cursor-default"
            : "bg-yellow-200 text-yellow-800 border-2 border-yellow-400 hover:bg-yellow-300"
        }`}
        disabled={!!(currentUserKey && localAnomaly.reviewedBy?.[currentUserKey])}
      >
        {currentUserKey && localAnomaly.reviewedBy?.[currentUserKey]
          ? `✅ ${t("reportsTable.reviewed")}`
          : `⏳ ${t("reportsTable.markAsReviewed")}`}
      </button>
    </div>

    {/* Collapsible Content */}
    {anomalyDetailsOpen && (
      <div className="px-6 pb-4 text-sm leading-relaxed">

    {/* Two Column Layout */}
    <div className="flex gap-10 items-start bg-white rounded-lg p-4 border-l-4 border-l-orange-400">

      {/* Left Column — generalMessage */}
      <div className="w-1/2">
        {localAnomaly.generalMessage && (
          <p className="mt-1 mb-4 text-gray-800 leading-relaxed whitespace-pre-line border-l-4 border-l-blue-400 pl-3">
            &ldquo;{localAnomaly.generalMessage}&rdquo;
          </p>
        )}
      </div>

      {/* Right Column — Data List */}
      <div className="w-1/2">
        <ul className="space-y-2 text-gray-800">
          <li className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span><strong>{t("reportsTable.currentReports")}:</strong> {localAnomaly.metrics.currentReports}</span>
            <Tooltip message={t("reportsTable.currentReportsTooltip")}/>
          </li>

            {localAnomaly.type === "slow_response" && (
    <li className="flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            <span><strong>{t("reportsTable.avgProcessingTime")}:</strong> {localAnomaly.metrics.currentAvgDays} {t("common.days")}</span>
            <Tooltip message={t("reportsTable.avgProcessingTimeTooltip")}/>
    </li>
  )}

          <li className="flex items-center gap-2">
            <span className="text-lg">📈</span>
            <span><strong>{t("reportsTable.historicalAvg")}:</strong> {localAnomaly.metrics.baselineMean}</span>
            <Tooltip message={t("reportsTable.historicalAvgTooltip")} />
          </li>

          <li className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span><strong>{t("reportsTable.stdDev")}:</strong> {localAnomaly.metrics.baselineStd}</span>
            <Tooltip message={t("reportsTable.stdDevTooltip")} />
          </li>

          <li className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span><strong>{t("reportsTable.threshold")}:</strong> {localAnomaly.metrics.threshold}</span>
          <Tooltip message={t("reportsTable.thresholdTooltip")} />
          </li>

          <li className="flex items-center gap-2">
            <span className="text-lg">📉</span>
            <span><strong>{t("reportsTable.change")}:</strong> {localAnomaly.metrics.pctChange > 0 ? "+" : ""}{localAnomaly.metrics.pctChange}%</span>
            <Tooltip message={t("reportsTable.changeTooltip")} />
          </li>

          <li className="flex items-center gap-2">
            <span className="text-lg">📐</span>
            <span><strong>{t("reportsTable.zScore")}:</strong> {localAnomaly.metrics.zScore}</span>
            <Tooltip message={t("reportsTable.zScoreTooltip")} />
          </li>

          <li className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <span><strong>{t("reportsTable.firstDetected")}:</strong> {new Date(localAnomaly.firstDetected).toLocaleDateString(language === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", year: "2-digit" })}</span>
          </li>

          {localAnomaly.center && (
            <li className="flex items-center gap-2">
              <span className="text-lg">🗺️</span>
              <span><strong>{t("reportsTable.geographicCenter")}:</strong> {localAnomaly.center.lat.toFixed(5)}, {localAnomaly.center.lng.toFixed(5)}</span>
            </li>
          )}

        </ul>
      </div>
    </div>

    {/* Reviewed By List */}
    {localAnomaly.reviewedBy && (
      <div className="mt-4 border-t pt-3 bg-white rounded-lg p-3 border-l-4 border-l-green-400">
        <h3 className="font-bold mb-2 text-green-700 flex items-center gap-2">✔️ {t("reportsTable.reviewedBy")}:</h3>
        <ul className="space-y-1 text-sm">
          {Object.entries(localAnomaly.reviewedBy).map(([emailKey, ts]) => (
            <li key={emailKey} className="text-gray-700">
              📝 <span className="font-mono">{emailKey.replace(/_/g, ".")}</span> – {new Date(ts).toLocaleDateString(language === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", year: "2-digit" })}
            </li>
          ))}
        </ul>
      </div>
    )}
      </div>
    )}
  </div>
)}




          {/* Top Bar - Enhanced */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
          <div className="flex items-center gap-3">
          <button
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            onClick={() => {
              const selected = rows.filter(r => selectedReports.includes(r.id ?? ""));
              if (selected.length === 0) {
                alert(t("reportsTable.noReportsSelected"));
                return;
              }
              setReportsToShow(selected);
              setMapOpen(true);
            }}
          >
            📍 {t("reportsTable.showOnMap")}
          </button>
          {selectedReports.length > 0 && (
            <div className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span>{selectedReports.length} {t("reportsTable.selected")}</span>
            </div>
          )}
          </div>
          
            <div className="flex gap-1 items-center">
              <button
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                onClick={() => {
                  const selected = rows.filter(r => selectedReports.includes(r.id ?? ""));
                  if (selected.length === 0) {
                    alert(t("reportsTable.noReportsSelected"));
                    return;
                  }
                  // Check if ALL selected reports are pending
                  const allPending = selected.every(r => r.status === "pending");
                  if (!allPending) {
                    alert(t("reportsTable.onlyPendingAllowed"));
                    return;
                  }
                  handleGenerateDualLinks();
                }}
              >
                🛣️ {t("reportsTable.routeLink")}
                <Tooltip message={t("reportsTable.tooltips.routeLink")} position="bottom" />
              </button>
              <button
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                onClick={() => {
                  const selected = rows.filter(r => selectedReports.includes(r.id ?? ""));
                  if (selected.length === 0) {
                    alert(t("reportsTable.noReportsSelected"));
                    return;
                  }
                  // Check if ALL selected reports are pending
                  const allPending = selected.every(r => r.status === "pending");
                  if (!allPending) {
                    alert(t("reportsTable.onlyPendingAllowed"));
                    return;
                  }
                  setFieldWorkerReports(selected);
                  setFieldWorkerModalOpen(true);
                }}
              >
                📄 {t("reportsTable.fieldWorkerFile")}
                <Tooltip message={t("reportsTable.tooltips.workOrder")} position="bottom" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder={`🔍 ${t("reportsTable.searchById")}...`}
                className="border-2 border-gray-300 focus:border-blue-500 focus:outline-none px-3 py-2 rounded-lg font-medium transition-colors"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
              <button
                className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                onClick={() => setFiltersOpen(true)}
              >
                🔧 {t("reportsTable.filter")}
              </button>
              <button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
                onClick={handleDeleteSelection}
              >
                🗑️ {t("reportsTable.delete")}
              </button>
              <button className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all" onClick={selectAll}>
                {selectedReports.length === filteredRows.length ? `📭 ${t("reportsTable.unselectAll")}` : `✅ ${t("reportsTable.selectAll")}`}
              </button>
            </div>
          </div>

{/* 🔽 במקום ה־div של הטבלה + ה־footer הנפרד, נעטוף אותם יחד */}
<div className="flex-1 overflow-y-auto flex flex-col">

  {/* Table */}
  <div className="p-3 bg-white">
    <table className="w-full text-sm border-separate border-spacing-0">
      <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold sticky top-0 z-20 shadow-lg">
        <tr>
          <th className="p-3 text-center">✔</th>
          <th className="p-3 text-center cursor-pointer hover:bg-blue-700 transition-colors">📋 {t("reportsTable.columns.id")}</th>
          <th className="p-3 text-center cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => handleSort("Category")}>
            📁 {t("reportsTable.columns.category")}
            <Tooltip message={t("reportsTable.tooltips.category")} position="bottom" />
          </th>
          <th className="p-3 text-left cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => handleSort("Description")}>
            📝 {t("reportsTable.columns.description")}
          </th>
          <th className="p-3 text-center cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => handleSort("Criticality")}>
            ⚠️ {t("reportsTable.columns.level")}
            <Tooltip message={t("reportsTable.tooltips.level")} position="bottom" />
          </th>
          <th className="p-3 text-center cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => handleSort("Timestamp")}>
            📅 {t("reportsTable.columns.date")}
          </th>
          <th className="p-3 text-center cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => handleSort("Location")}>
            📍 {t("reportsTable.columns.area")}
          </th>
          <th className="p-3 text-left cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => handleSort("Address")}>
            🏢 {t("reportsTable.columns.address")}
          </th>
          <th className="p-3 text-center cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => handleSort("Status")}>
            ✓ {t("reportsTable.columns.status")}
            <Tooltip message={t("reportsTable.tooltips.status")} position="bottom" />
          </th>
          <th className="p-3 text-center cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => handleSort("Media")}>
            📷 {t("reportsTable.columns.media")}
          </th>
          <th className="p-3 text-center">⚙️ {t("reportsTable.columns.actions")}</th>
        </tr>
      </thead>

      <tbody>
        {sortedRows.map((r) => {
          const rowId = getRowId(r);
          return (
            <tr
              key={rowId}
              className={`border-b transition-all ${
                selectedReports.includes(rowId)
                  ? "bg-green-100 border-l-4 border-l-green-600"
                  : "hover:bg-blue-50 border-l-4 border-l-transparent"
              }`}
            >
              <td className="p-3 text-center">
                <input
                  type="checkbox"
                  checked={selectedReports.includes(rowId)}
                  onChange={() => toggleSelect(rowId)}
                  className="w-4 h-4 cursor-pointer"
                />
              </td>
              <td className="p-3 text-center font-mono text-xs text-gray-700">{r.id ?? "—"}</td>
              <td className="p-3 text-center capitalize">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                  {r.type}
                </span>
              </td>
              <td className="p-3 text-gray-800 font-medium">{r.description}</td>
              <td className="p-3 text-center">
                {r.type ? <CriticalityCell timestamp={r.timestamp} type={r.type} /> : "—"}
              </td>
              <td className="p-3 text-center text-xs text-gray-700 whitespace-nowrap">
                {new Date(r.timestamp).toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
                  month: "short",
                  day: "numeric",
                  year: "2-digit"
                })}
              </td>
              <td className="p-3 text-center">
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-semibold">
                  {r.area}
                </span>
              </td>
              <td className="p-3 text-gray-700 text-sm">{r.address || "—"}</td>
              <td className="p-3 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  r.status === "resolved" ? "bg-green-200 text-green-800" :
                  r.status === "open" ? "bg-red-200 text-red-800" :
                  r.status === "pending" ? "bg-black-200 text-black-800" :
                  "bg-blue-200 text-blue-800"
                }`}>
                  {r.status}
                </span>
              </td>
              <td className="p-3 text-center text-xl">{r.media ? "📷" : "—"}</td>
              <td className="p-3 text-center space-x-2">
                <button
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md hover:shadow-lg transition-all"
                  onClick={() => {
                    setReportsToShow([r]);
                    setMapOpen(true);
                  }}
                >
                  📍 {t("reportsTable.map")}
                </button>
                <button
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md hover:shadow-lg transition-all"
                  onClick={() => handleOpenDetails(r)}
                >
                  👁️ {t("reportsTable.details")}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {filteredRows.length === 0 && (
      <div className="text-center py-8 text-gray-500">
        {(() => {
          // Check if any filters are applied
          const hasFilters = 
            filters.categories.length > 0 ||
            filters.location ||
            (filters.statusList && filters.statusList.length > 0) ||
            (filters.status !== "all") ||
            filters.mediaOnly ||
            filters.dateFrom ||
            filters.dateTo ||
            (filters.criticalityList && filters.criticalityList.length > 0) ||
            filters.criticality;

          if (!hasFilters) {
            return (
              <div>
                <p className="text-lg font-semibold mb-2">📋 {t("reportsTable.noFiltersApplied")}</p>
                <p className="text-sm">{t("reportsTable.applyFiltersToSeeReports")}</p>
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                >
                  🧰 {t("filters.title")}
                </button>
              </div>
            );
          }

          return t("reportsTable.noReportsFound");
        })()}
      </div>
    )}
  </div>

  {/* footer – נמצא בתוך אותו אזור גלילה, אבל עם shrink-0 */}
  <div className="border-t p-3 text-right bg-gray-50 shrink-0">

  </div>
</div>
  </div>

      </Modal>

      {/* חלון הפילטרים */}
      <FiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        currentFilters={{
          categories: filters.categories,
          location: filters.location,
          status: filters.status,
          statusList: filters.statusList || [],
          mediaOnly: filters.mediaOnly,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          criticality: filters.criticality || "",
          criticalityList: filters.criticalityList || [],
        }}
        onApply={(newFilters) => {
          setFilters({
            categories: newFilters.categories,
            location: newFilters.location,
            status: newFilters.status,
            statusList: newFilters.statusList || [],
            mediaOnly: newFilters.mediaOnly,
            dateFrom: newFilters.dateFrom,
            dateTo: newFilters.dateTo,
            criticality: newFilters.criticality || "",
            criticalityList: newFilters.criticalityList || [],
          });
          onApplyFilters?.(newFilters);
          setFiltersOpen(false);
        }}
      />
            {/* 🗺️ חלון המפה */}
      {mapOpen && (
        <ReportsMapModal
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          reports={reportsToShow}
          criticality={filters.criticality}
          selectedArea={selectedArea}
          anomalyDetails={anomalyDetails}
        />
      )}
      {detailsOpen && selectedReport && (
      <ReportDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        report={selectedReport}
        onReportUpdated={(updated) => {
          // If the report was deleted → remove from table and close details
          if (updated.deleted) {
            setRows(prev => prev.filter(r => r.id !== updated.id));
            setSelectedReport(null);
            setDetailsOpen(false);
            return;
          }

          // Otherwise → inline update
          setRows(prev => prev.map(r => (r.id === updated.id ? { ...r, ...updated } : r)));
          setSelectedReport(prev => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
        }}
      />
      )}
         { /* 🔗 חלון הלינק שנוצר */}
          {linkModalOpen && (
            <Modal title={t("reportsTable.generatedRouteLinks")} onClose={() => setLinkModalOpen(false)}>
              <div className="p-6 text-center">
                <p className="text-gray-700 text-sm mb-4">
                  {t("reportsTable.routeLinksDescriptionClean")}
                </p>
                <p className="text-red-600 font-bold mb-4">
                  {t("reportsTable.enableGpsWarning")}
                </p>

                {/* לינק נקי */}
                <div className="mb-5">
                  <h3 className="font-semibold mb-1">🔹 {t("reportsTable.cleanRouteTitle")}</h3>
                  <button
                    onClick={() => window.open(generatedCleanLink, "_blank")}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
                  >
                    {t("reportsTable.openCleanRoute")}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-5">
                  {t("reportsTable.linkCopiedNote")}
                </p>
              </div>
            </Modal>
          )}

          {/* 📄 Field Worker File Generator Modal */}
          {fieldWorkerModalOpen && (
            <Modal title={t("reportsTable.fieldWorkerFileTitle")} onClose={() => setFieldWorkerModalOpen(false)}>
              <div className="p-6">
                {/* Description */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                  <h3 className="font-bold text-blue-800 mb-2">📋 {t("reportsTable.fieldWorkerFileDescription")}</h3>
                  <p className="text-sm text-blue-700">
                    {t("reportsTable.fieldWorkerFileInfo")}
                  </p>
                </div>

                {/* Report count info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-5 text-center">
                  <p className="text-green-800 font-semibold">
                    ✅ {fieldWorkerReports.length} {t("reportsTable.pendingReportsReady")}
                  </p>
                </div>

                {/* Generate button */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      // Generate WhatsApp-friendly text content
                      const dateStr = new Date().toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      });
                      
                      let content = `📋 ${t("reportsTable.fieldWorkerListTitle")}\n`;
                      content += `📅 ${t("reportsTable.generatedOn")}: ${dateStr}\n`;
                      content += `📊 ${t("reportsTable.totalReports")}: ${fieldWorkerReports.length}\n`;
                      content += "═".repeat(40) + "\n\n";

                      fieldWorkerReports.forEach((r, index) => {
                        const reportDate = new Date(r.timestamp).toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
                          month: "short",
                          day: "numeric",
                          year: "2-digit"
                        });
                        
                        content += `📌 ${t("reportsTable.reportNumber")} ${index + 1}\n`;
                        content += "─".repeat(30) + "\n";
                        content += `📋 ${t("reportsTable.columns.id")}: ${r.id ?? "—"}\n`;
                        content += `📁 ${t("reportsTable.columns.category")}: ${r.type}\n`;
                        content += `📝 ${t("reportsTable.columns.description")}: ${r.description}\n`;
                        content += `📅 ${t("reportsTable.columns.date")}: ${reportDate}\n`;
                        content += `📍 ${t("reportsTable.columns.area")}: ${r.area}\n`;
                        content += `🏢 ${t("reportsTable.columns.address")}: ${r.address || "—"}\n`;
                        content += `✓ ${t("reportsTable.columns.status")}: ${r.status}\n`;
                        content += `📷 ${t("reportsTable.columns.media")}: ${r.media ? t("reportsTable.hasMedia") : t("reportsTable.noMedia")}\n`;
                        content += "\n";
                      });

                      content += "═".repeat(40) + "\n";
                      content += `✅ ${t("reportsTable.endOfList")}\n`;

                      // Create and download the file
                      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `WorkOrder_${new Date().toISOString().split("T")[0]}.txt`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);

                      // Also copy to clipboard for easy sharing
                      navigator.clipboard.writeText(content);
                        alert(t("reportsTable.fileGeneratedAndCopied"));
                      }}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
                      >
                      📥 {t("reportsTable.generateAndDownload")}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-5 text-center">
                  {t("reportsTable.fieldWorkerFileNote")}
                </p>
              </div>
            </Modal>
          )}
    </>
  );
}
