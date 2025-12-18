"use client";
import { useEffect, useState, useMemo } from "react";
import  Modal  from "@/components/dashboard/Modal";
import FiltersModal from "@/components/dashboard/FiltersModal";
import { fetchReports, deleteReport } from "@/lib/client/fetchers";
import { Report,Anomaly } from "@/lib/types";
import ReportsMapModal from "@/components/dashboard/ReportsMapModal";
import ReportDetailsModal from "@/components/dashboard/ReportDetailsModal";
import { getCurrentUserInfo } from "@/lib/client/fetchers";
import Image from "next/image";
import Tooltip from "@/components/dashboard/Tooltip";
import { SLA_DAYS } from "@/lib/server/sla";  
import { getReportCriticalityType } from "@/lib/server/sla";

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
  
}

type FiltersPayload = {
  categories: string[];
  location: string;
  status: "open" | "pending" | "in progress" | "resolved" | "all";
  mediaOnly: boolean;
  dateFrom: string | null;
  dateTo: string | null;
   criticality?: string;
};




// ✅ פונקציה שמחזירה כתובת מעודכנת בדיוק כמו שגוגל משתמשת בה
async function getGoogleFormattedAddress(lat: number, lng: number): Promise<string> {
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    const latlng = { lat, lng };
    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        resolve(results[0].formatted_address); // כתובת רשמית
      } else {
        resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); // fallback
      }
    });
  });
}

export default function ReportsTableModal({
  open,
  onClose,
  reports: externalReports,
  selectedArea, 
  onApplyFilters,
  title,
  anomalyDetails,
  onReviewUpdate,
}: ReportsTableModalProps) {
/////////////////////////////////////////////////////////////////consts://///////////////////////
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
  const [filters, setFilters] = useState<FiltersPayload>({
    categories: [],
    location: "",
    status: "all",
    mediaOnly: false,
    dateFrom: null,
    dateTo: null,
    criticality: "",
  })
  const [mapOpen, setMapOpen] = useState(false);
  const [reportsToShow, setReportsToShow] = useState<Report[]>([]);
  // 🔍 שליטה על פתיחת חלון הפרטים
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [localAnomaly, setLocalAnomaly] = useState(anomalyDetails);
  const { email: currentUserEmail, safeKey: currentUserKey } = getCurrentUserInfo();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [generatedCleanLink, setGeneratedCleanLink] = useState("");
  const [generatedLabeledLink, setGeneratedLabeledLink] = useState("");
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  // 🧭 ניהול מיון
  const [sortColumn, setSortColumn] = useState<string>(""); 
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const handleOpenDetails = (report: Report) => {
    console.log("Opening details for:", report.id, report.type);
    setSelectedReport(report);
    setDetailsOpen(true);
  };





  ///////////////////////////////////////////////////////////////functions global////////////////////////////////////


// // ✅ מחשב את רמת הקריטיות לפי תאריך
// function getReportCriticality(timestamp: number, type?: string) {
//   const reportDate = new Date(timestamp);
//   const now = new Date();
//   const diffDays = Math.floor(
//     (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24)
//   );

//   const ranges = [
//     { max: 5, level: "חדש", key: "green" },
//     { max: 14, level: "בינוני", key: "yellow" },
//     { max: 30, level: "ישן", key: "orange" },
//     { max: Infinity, level: "קריטי", key: "red" },
//   ];

//   const current = ranges.find(r => diffDays <= r.max)!;
//   const normalizedType = type?.toLowerCase() || "default";

//   return {
//     level: current.level,
//     color: current.key,
//     icon: `/icons/${current.key}_${normalizedType}.png`,
//   };
// }


//sla version
function getReportCriticality(timestamp: number, type?: string) {
  const now = Date.now();
  const ageDays = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));

  const sla = SLA_DAYS[type ?? "default"] ?? 7;

  let color = "green";
  if (ageDays > sla * 2) color = "red";
  else if (ageDays > sla) color = "orange";
  else if (ageDays >= sla * 0.5) color = "yellow";

  return {
    level:
      color === "green"   ? "חדש" :
      color === "yellow"  ? "בינוני" :
      color === "orange"  ? "ישן" :
      "קריטי",
    color,
    icon: `/icons/${color}_${type ?? "default"}.png`,
  };
}






//  function CriticalityCell({ timestamp, type }: Props) {
//   const c = getReportCriticality(timestamp, type);
//   const [imgSrc, setImgSrc] = useState(c.icon);

//   return (
//     <div className="flex flex-col items-center justify-center">
//       <Image
//         src={imgSrc}
//         alt={c.level}
//         width={24}
//         height={24}
//         onError={() => setImgSrc(`/icons/${c.color}_default.png`)}
//         unoptimized
//       />
//       <span style={{ color: c.color, fontSize: "13px" }}>{c.level}</span>
//     </div>
//   );
// }


function CriticalityCell({ timestamp, type }: Props) {
  // מייצרים אובייקט "report" מלא רק עם מה שפונקציית ה-SLA צריכה
const fakeReport: Partial<Report> = {
  timestamp,
  type,
};

  // ← כאן שינינו! עכשיו משתמשים ב-SLA האמיתי
 const crit = getReportCriticalityType(fakeReport as Report);// מחזיר: "green" | "yellow" | "orange" | "red"

  const icon = `/icons/${crit}_${type}.png`;

  const level =
    crit === "green"  ? "חדש" :
    crit === "yellow" ? "בינוני" :
    crit === "orange" ? "ישן" :
    "קריטי";

  const [imgSrc, setImgSrc] = useState(icon);

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
      <span style={{ color: crit, fontSize: "13px" }}>{level}</span>
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



  // טוען דיווחים
  useEffect(() => {
    if (!open) return;

    async function load() {
      if (externalReports && externalReports.length > 0) {
        // ✅ גם כאן נסנן אם רוצים למנוע הופעת מחוקים
        // const filtered = externalReports.filter((r) => !r.deleted);
        // אל תזרוק deleted — אנומליה זקוקה גם לדיווחים שאינם active
        // const filtered = externalReports;
        // setRows(filtered);
        setRows(externalReports);
        return;
      }

      const data = await fetchReports();
      const all: Report[] = [];

      Object.entries(data).forEach(([type, group]) => {
        Object.entries(group as Record<string, Omit<Report, "type" | "id">>).forEach(
          ([id, report]) => {
            all.push({ ...report, type, id });
          }
        );
      });

      // // ✅ כאן אנחנו מסננים דיווחים שמסומנים כמחוקים
      // const activeReports = all.filter((r) => !r.deleted);
      // setRows(activeReports);
            setRows(all);
    }

    load();
  }, [open, externalReports]);


  
const filteredRows = useMemo(() => {
  // ⭐ במצב אנומליה — משתמשים רק בדיווחים שלה, ללא סינון כלל
  if (anomalyDetails) {
    return anomalyRows.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ⭐ במצב רגיל — סינון רגיל
  return rows.filter((r) => {
    const categoryMatch =
      filters.categories.length === 0 ||
      filters.categories.includes(r.type ?? "");

    const locationMatch =
      !filters.location || r.area === filters.location;

    const statusMatch =
      filters.status === "all"
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

      const criticalityMatch =
        !filters.criticality ||
        getReportCriticalityType(r) === filters.criticality;
      
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
    alert("No reports selected.");
    return;
  }

  const confirmDelete = confirm(`Delete ${selectedReports.length} reports?`);
  if (!confirmDelete) return;

  for (const id of selectedReports) {
    const report = rows.find(r => r.id === id);
    if (report) {
      await deleteReport(report.type ?? "", report.id ?? "");
    }
  }

  // הסרה גם מהטבלה המקומית
  setRows(rows.filter(r => !selectedReports.includes(r.id ?? "")));
  setSelectedReports([]);
  alert("Selected reports deleted successfully.");


}
  
async function handleGenerateDualLinks() {
  const selected = rows.filter((r) => selectedReports.includes(r.id ?? ""));
  if (selected.length < 2) {
    alert("בחר לפחות שני דיווחים כדי לייצר מסלול.");
    return;
  }

  // ✅ מנסה לקבל את המיקום הנוכחי של המשתמש דרך GPS
  const getUserLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("שירות מיקום לא נתמך בדפדפן זה.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject("⚠️ לא ניתן היה לזהות את המיקום הנוכחי שלך."),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  let userLocation: { lat: number; lng: number } | null = null;
  try {
    userLocation = await getUserLocation();
    alert("📍 המיקום הנוכחי נוסף למסלול!");
  } catch (err) {
    console.warn(err);
    alert(err);
  }

  // ✅ נבנה רשימת נקודות לניווט — נוסיף את המיקום הנוכחי בתחילת המסלול בלבד
  const routePoints: { lat: number; lng: number }[] = [];
  if (userLocation) routePoints.push(userLocation);
  routePoints.push(...selected.map((r) => ({ lat: r.lat, lng: r.lng })));

  // ✅ מביאים את הכתובות שגוגל עצמה מחזירה (רק עבור הדיווחים עצמם)
  const formattedAddresses = await Promise.all(
    selected.map((r) => getGoogleFormattedAddress(r.lat, r.lng))
  );

  // --------------------------
  // 🔹 לינק נקי (כולל GPS כנקודת התחלה)
  const originClean = `${routePoints[0].lat},${routePoints[0].lng}`;
  const destinationClean = `${routePoints[routePoints.length - 1].lat},${routePoints[routePoints.length - 1].lng}`;
  const waypointsClean = routePoints
    .slice(1, -1)
    .map((p) => `${p.lat},${p.lng}`)
    .join("|");

  const cleanLink = waypointsClean
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        originClean
      )}&destination=${encodeURIComponent(
        destinationClean
      )}&waypoints=${encodeURIComponent(
        waypointsClean
      )}&travelmode=driving&hl=he`
    : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        originClean
      )}&destination=${encodeURIComponent(
        destinationClean
      )}&travelmode=driving&hl=he`;

  // --------------------------
  // 🔹 לינק עם מזהים (לצפייה בלבד)
  const labeledAddresses = formattedAddresses.map(
    (addr, i) =>
      `${addr}(rpt_${selected[i].id?.replace("rpt_", "") ?? "unknown"})`
  );

  const originLabeled = userLocation
    ? "מיקום נוכחי (GPS)"
    : labeledAddresses[0];
  const destinationLabeled = labeledAddresses[labeledAddresses.length - 1];
  const waypointsLabeled = labeledAddresses.slice(1, -1).join("|");

  const labeledLink = waypointsLabeled
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        originLabeled
      )}&destination=${encodeURIComponent(
        destinationLabeled
      )}&waypoints=${encodeURIComponent(
        waypointsLabeled
      )}&travelmode=driving&hl=he`
    : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        originLabeled
      )}&destination=${encodeURIComponent(
        destinationLabeled
      )}&travelmode=driving&hl=he`;

  // --------------------------
  // שמירה והעתקה
  setGeneratedCleanLink(cleanLink);
  setGeneratedLabeledLink(labeledLink);
  navigator.clipboard.writeText(`${cleanLink}\n\n${labeledLink}`);
  setLinkModalOpen(true);
}




return (
  <>
    <Modal title={title ?? "Reports Table"} onClose={onClose}>
      <div className="flex flex-col bg-white rounded-lg shadow-lg max-w-[95vw] max-h-[90vh] w-[1000px] overflow-hidden">

{/* פירוט האנומליה מעל הטבלה */}
{localAnomaly && (
  <div className="px-6 pt-4 pb-3 text-sm text-gray-700 leading-relaxed border-b mb-3 bg-gray-50">

    {/* כותרת + כפתור Reviewed */}
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-semibold text-lg text-gray-900">
        פרטים על האנומליה:
      </h2>

      {/* כפתור סימון כ־Reviewed — נשאר זהה */}
      <button
        onClick={async () => {
          if (!currentUserKey) {
            alert("לא נמצא משתמש מחובר");
            return;
          }

          const alreadyReviewed =
            !!localAnomaly.reviewedBy?.[currentUserKey];

          if (alreadyReviewed) {
            alert("כבר סימנת את האנומליה הזו כ־Reviewed ✅");
            return;
          }

          if (!confirm("האם אתה בטוח שקראת ובדקת את האנומליה הזו?")) return;

          try {
            const { markAnomalyAsReviewed } = await import("@/lib/client/fetchers");
            const result = await markAnomalyAsReviewed(localAnomaly);

            if (result.alreadyReviewed) {
              alert("כבר סומנה בעבר");
              return;
            }

            setLocalAnomaly(prev => ({
              ...prev!,
              reviewedBy: {
                ...(prev?.reviewedBy ?? {}),
                [currentUserKey]: result.timestamp ?? Date.now(),
              },
            }));

            if (onReviewUpdate) {
              onReviewUpdate({
                ...localAnomaly,
                reviewedBy: {
                  ...(localAnomaly.reviewedBy ?? {}),
                  [currentUserKey]: result.timestamp ?? Date.now(),
                }
              });
            }

            alert(`סומנה כ־Reviewed על ידי ${result.email}`);
          } catch (err) {
            console.error(err);
            alert("❌ שגיאה בעדכון המצב");
          }
        }}
        className={`rounded-md px-3 py-1 text-sm font-medium ${
          currentUserKey && localAnomaly.reviewedBy?.[currentUserKey]
            ? "bg-green-100 text-green-700 border border-green-300 cursor-default"
            : "bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200"
        }`}
        disabled={!!(currentUserKey && localAnomaly.reviewedBy?.[currentUserKey])}
      >
        {currentUserKey && localAnomaly.reviewedBy?.[currentUserKey]
          ? "✅ Already Reviewed"
          : "❌ Not Reviewed yet"}
      </button>
    </div>

    {/* ⭐ מבנה שני טורים */}
    <div className="flex gap-10 items-start">

      {/* טור ימין — generalMessage */}
      <div className="w-1/2">
        {localAnomaly.generalMessage && (
          <p className="mt-1 mb-4 text-gray-800 leading-relaxed whitespace-pre-line">
            {localAnomaly.generalMessage}
          </p>
        )}
      </div>

      {/* טור שמאל — רשימת הנתונים */}
      <div className="w-1/2">
        <ul className="list-disc pl-5 space-y-1 text-gray-800">
          <li>
            <strong> דיווחים בחודש הנוכחי </strong>{" "}
            {localAnomaly.metrics.currentReports}
            <Tooltip message="current"/>
          </li>

            {localAnomaly.type === "slow_response" && ( //if..
    <li>
            <strong> זמן הטיפול הממוצע </strong>{" "}
            {localAnomaly.metrics.currentAvgDays}
            <Tooltip message="ממוצע כל זמני הטיפול של הדיווחים מהסוג הזה שנסגרו בחודש הנוכחי."/>
    </li>
  )}

          <li>
            <strong>ממוצע היסטורי:</strong>{" "}
            {localAnomaly.metrics.baselineMean}
            <Tooltip message="כמה דיווחים היו בממוצע ב־6 חודשים קודמים באזור זה." />
          </li>

          <li>
            <strong>סטיית תקן:</strong>{" "}
            {localAnomaly.metrics.baselineStd}
            <Tooltip message="כמה המשתנים מפוזרים סביב הממוצע. ערך גבוה = הרבה חוסר יציבות. אם סטיית תקן היא X אז כמות הדיווחים זזה ±X מהממוצע." />
          </li>

          <li>
            <strong>Threshold (סף גילוי):</strong>{" "}
            {localAnomaly.metrics.threshold}
          <Tooltip
            message={
              "Threshold\n" +
              "זהו סף ההשוואה שהמערכת קובעת.\n\n" +

              "Current\n" +
              "זה הערך הנוכחי שמופיע למעלה באנומליה.\n\n" +

              "כדי להבין אם יש חריגה:\n" +
              "מסתכלים על הערך הנוכחי\n" +
              "Current\n" +
              "ואז משווים אותו לערך הסף\n" +
              "Threshold\n\n" +

              "אם הערך הנוכחי גדול מערך הסף — יש חריגה.\n" +
              "אם הערך הנוכחי קטן או שווה — המצב תקין."
            }
          />
          </li>

          <li>
            <strong>שינוי באחוזים:</strong>{" "}
            {localAnomaly.metrics.pctChange > 0 ? "+" : ""}
            {localAnomaly.metrics.pctChange}%
            <Tooltip message="כמה אחוזים הדיווחים הנוכחיים גבוהים מהממוצע." />
          </li>

          <li>
            <strong>Z-Score:</strong>{" "}
            {localAnomaly.metrics.zScore}
            <Tooltip
              message={
                "Z-Score מודד כמה רחוק נתון נמצא מהממוצע, ביחידות של סטיית תקן.\n\n" +
                "• Z = 0 — הנתון שווה לממוצע\n" +
                "• Z > 0 — הנתון גבוה מהממוצע\n" +
                "• Z < 0 — הנתון נמוך מהממוצע\n\n" +
                "מתי זה טוב?\n" +
                "• Z נמוך — זמן טיפול קצר מהרגיל, המצב טוב.\n\n" +
                "מתי זה רע?\n" +
                "• Z גבוה — זמן טיפול ארוך מהממוצע, ייתכן עומס או תקלה.\n\n" +
                "משמש לנרמול נתונים ולזיהוי חריגות."
              }
            />
          </li>

          <li>
            <strong>זוהה בפעם הראשונה בתאריך:</strong>{" "}
            {new Date(localAnomaly.firstDetected).toLocaleString("he-IL")}
          </li>

          {localAnomaly.center && (
            <li>
              <strong>מרכז גיאוגרפי:</strong>{" "}
              {localAnomaly.center.lat.toFixed(5)},{" "}
              {localAnomaly.center.lng.toFixed(5)}
            </li>
          )}

        </ul>
      </div>
    </div>

    {/* --- רשימת מי שסקר --- */}
    {localAnomaly.reviewedBy && (
      <div className="mt-4 border-t pt-2">
        <h3 className="font-semibold mb-1">✔️ כבר סוקר על ידי:</h3>
        <ul className="list-disc pl-5">
          {Object.entries(localAnomaly.reviewedBy).map(([emailKey, ts]) => (
            <li key={emailKey}>
              {emailKey.replace(/_/g, ".")} –{" "}
              {new Date(ts).toLocaleString("he-IL")}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}




          {/* טופ־בר */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b bg-gray-50">
          <button
            className="text-blue-600 font-semibold hover:underline"
            onClick={() => {
              const selected = rows.filter(r => selectedReports.includes(r.id ?? ""));
              if (selected.length === 0) {
                alert("No reports selected.");
                return;
              }
              setReportsToShow(selected);
              setMapOpen(true);
            }}
          >
            Show all reports on map
          </button>
          
            <button
            className="text-green-600 font-semibold hover:underline ml-3"
            onClick={handleGenerateDualLinks}
          >
            Generate fastest route link
          </button>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Search by Report ID..."
                className="border px-2 py-1 rounded"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
              <button
                className="bg-gray-300 px-3 py-1 rounded font-semibold hover:bg-gray-400"
                onClick={() => setFiltersOpen(true)}
              >
                Filter & Sort
              </button>
              <button className="bg-red-400 hover:bg-red-500 px-3 py-1 rounded text-white font-semibold"
                onClick={handleDeleteSelection} // 
              >
                Delete selection
              </button>
              <button className="ml-2 border px-2 py-1 rounded" onClick={selectAll}>
                {selectedReports.length === filteredRows.length ? "Unselect all" : "Select all"}
              </button>
            </div>
          </div>

{/* 🔽 במקום ה־div של הטבלה + ה־footer הנפרד, נעטוף אותם יחד */}
<div className="flex-1 overflow-y-auto flex flex-col">

  {/* טבלה */}
  <div className="p-3 bg-white">
    <table className="w-full text-sm border-separate border-spacing-0">
      <thead className="bg-white border-b-2 border-gray-300 font-semibold sticky top-0 z-20 shadow-sm">
        <tr>
          <th className="p-2 border w-[40px]">✔</th>
          <th className="p-2 border w-[90px]">Report ID</th>
          <th className="p-2 border w-[100px] cursor-pointer hover:bg-gray-200" onClick={() => handleSort("Category")}>
            Category
          </th>
          <th className="p-2 border cursor-pointer hover:bg-gray-200" onClick={() => handleSort("Description")}>
            Description
          </th>
          <th className="p-2 border w-[120px] text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort("Criticality")}>
            Criticality
          </th>
          <th className="p-2 border w-[150px] cursor-pointer hover:bg-gray-200" onClick={() => handleSort("Timestamp")}>
            Timestamp
          </th>
          <th className="p-2 border w-[120px] cursor-pointer hover:bg-gray-200" onClick={() => handleSort("Location")}>
            Location
          </th>
          <th className="p-2 border w-[180px] cursor-pointer hover:bg-gray-200" onClick={() => handleSort("Address")}>
            Address
          </th>
          <th className="p-2 border w-[90px] cursor-pointer hover:bg-gray-200" onClick={() => handleSort("Status")}>
            Status
          </th>
          <th className="p-2 border w-[70px] cursor-pointer hover:bg-gray-200" onClick={() => handleSort("Media")}>
            Media
          </th>
          <th className="p-2 border w-[130px]">Actions</th>
        </tr>
      </thead>

      <tbody>
        {sortedRows.map((r) => {
          const rowId = getRowId(r);
          return (
            <tr
              key={rowId}
              className={`border ${
                selectedReports.includes(rowId)
                  ? "bg-green-100"
                  : "hover:bg-gray-50"
              }`}
            >
              <td className="p-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedReports.includes(rowId)}
                  onChange={() => toggleSelect(rowId)}
                />
              </td>
              <td className="p-2 text-center">{r.id ?? "—"}</td>
              <td className="p-2 text-center capitalize">{r.type}</td>
              <td className="p-2">{r.description}</td>
              <td className="text-center">
                {r.type ? <CriticalityCell timestamp={r.timestamp} type={r.type} /> : "—"}
              </td>
              <td className="p-2 text-center">
                {new Date(r.timestamp).toLocaleString("he-IL")}
              </td>
              <td className="p-2 text-center">{r.area}</td>
              <td>{r.address || "—"}</td>
              <td className="p-2 text-center">{r.status}</td>
              <td className="p-2 text-center">{r.media ? "📷" : "—"}</td>
              <td className="p-2 text-center space-x-2">
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => {
                    setReportsToShow([r]);
                    setMapOpen(true);
                  }}
                >
                  Show on map
                </button>
                <button
                  className="text-green-600 hover:underline"
                  onClick={() => handleOpenDetails(r)}
                >
                  Open Details
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {filteredRows.length === 0 && (
      <div className="text-center py-3 text-gray-500">
        No reports found.
      </div>
    )}
  </div>

  {/* footer – נמצא בתוך אותו אזור גלילה, אבל עם shrink-0 */}
  <div className="border-t p-3 text-right bg-gray-50 shrink-0">
    <button
      onClick={onClose}
      className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded font-semibold"
    >
      Close
    </button>
  </div>
</div>
  </div>

      </Modal>

      {/* חלון הפילטרים */}
      <FiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={(newFilters) => {
          setFilters({
            categories: newFilters.categories,
            location: newFilters.location,
            status: newFilters.status,
            mediaOnly: newFilters.mediaOnly,
            dateFrom: newFilters.dateFrom,
            dateTo: newFilters.dateTo,
            criticality: newFilters.criticality || "",
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
            <Modal title="Generated Route Links" onClose={() => setLinkModalOpen(false)}>
              <div className="p-6 text-center">
                <p className="text-gray-700 text-sm mb-4">
                  נוצרו שני לינקים – אחד עם מזהים לצפייה, ואחד נקי לניווט בפועל.
                </p>
                <p className="text-red-600 font-bold mb-4">
                  !!! בפאלפון שלכם google maps ב GPS נא לדאוג להפעיל !!!
                </p>

                {/* לינק עם מזהים */}
                <div className="mb-5">
                  <h3 className="font-semibold mb-1">🔹 עם מזהים (לצפייה בלבד)</h3>
                  <button
                    onClick={() => window.open(generatedLabeledLink, "_blank")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                  >
                    Open Labeled Route
                  </button>
                </div>

                {/* לינק נקי */}
                <div className="mb-5">
                  <h3 className="font-semibold mb-1">🔹 לינק נקי (לניווט אמיתי)</h3>
                  <button
                    onClick={() => window.open(generatedCleanLink, "_blank")}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
                  >
                    Open Clean Route
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-5">
                  * שני הלינקים הועתקו אוטומטית ללוח. ניתן לשלוח לעובדים להדבקה והפעלה.
                </p>
              </div>
            </Modal>
          )}
    </>
  );
}
