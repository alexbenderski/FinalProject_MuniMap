import { app } from "./firebase";
import { getDatabase, ref, get,remove, update } from "firebase/database";
import { Anomaly,DetailedStats,Report, AreaAgg,TimeRange } from "@/lib/types";
import { getAuth } from "firebase/auth";
import { set } from "firebase/database"; // נייבא את set




export async function fetchCitiesFromLocal() {
  const response = await fetch("/data/cities_data.txt");
  if (!response.ok) throw new Error("Failed to load file");
  return response.json();
}

// export async function fetchReports() {
//   const db = getDatabase(app); //recieve the realtime db object
//   const snapshot = await get(ref(db, "Reports")); //points to Reports reference and save the data from it to snapshot
//   return snapshot.val(); //extracts the data from the snapshot to regular object with can called json format.
// }

export async function fetchReports() {
  const db = getDatabase(app);
  const snapshot = await get(ref(db, "Reports"));
  if (!snapshot.exists()) return null;

  const data = snapshot.val();

  // ✅ נוסיף את הסינון כאן בלי any
  Object.keys(data).forEach((type) => {
    const filteredGroup = Object.fromEntries(
      Object.entries(data[type]).filter(([_, r]) => {
        const report = r as unknown as Report;
        return !report.deleted; // מדלג על דיווחים מחוקים
      })
    );
    data[type] = filteredGroup;
  });

  return data;
}


export async function deleteReport(reportType: string, reportId: string) {
  try {
    const db = getDatabase();
    await remove(ref(db, `Reports/${reportType}/${reportId}`));
        console.log(`Deleted report ${reportId}`);
  } catch (err) {
    console.error("Error deleting report:", err);
  }
}

export async function fetchAnomalies(): Promise<Anomaly[]> {
  try {
    const db = getDatabase(app);
    const snapshot = await get(ref(db, "Anomalies"));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();

    // המרה לפורמט הנכון: כולל firebaseKey (שם הצומת במסד)
    const anomalies: Anomaly[] = Object.entries(data).map(
      ([firebaseKey, anomalyData]) => ({
        firebaseKey,
        ...(anomalyData as Omit<Anomaly, "firebaseKey">),
      })
    );

    // מיון מהחדש לישן
    return anomalies.sort((a, b) => b.lastUpdated - a.lastUpdated);
  } catch (err) {
    console.error("Error fetching anomalies:", err);
    return [];
  }
}

export async function markAnomalyAsReviewed(anomaly: Anomaly) {
  const userEmail = "alex1@haifa.gov.il"; // TODO: לשים אימייל אמיתי מהאוטנטיקציה שלך
  const emailKey = userEmail.replace(/\./g, "_");
  const timestamp = Date.now();

  // בודק אם המשתמש כבר עשה REVIEW
  if (anomaly.reviewedBy && anomaly.reviewedBy[emailKey]) {
    return { alreadyReviewed: true, email: userEmail };
  }

  const anomalyPath = `Anomalies/${anomaly.firebaseKey}`;
  const db = getDatabase();
  const refPath = ref(db, anomalyPath);

  // עדכון בערכים הקיימים
  const newEntry = {
    [`reviewedBy/${emailKey}`]: timestamp
  };

  await update(refPath, newEntry);

  return {
    alreadyReviewed: false,
    email: userEmail,
    timestamp
  };
}

/**
 * מחזיר את האימייל של המשתמש הנוכחי ואת המפתח שלו (לשימוש במסד)
 */
export function getCurrentUserInfo() {
  const auth = getAuth();
  const email = auth.currentUser?.email ?? null;
  const safeKey = email ? email.replace(/\./g, "_") : null;

  return { email, safeKey };
}

export async function fetchReportsStats(
  timeRange: TimeRange,
  startDate?: Date,
  endDate?: Date
): Promise<{ total: number; open: number; pending: number; inProgress: number }> {
  const db = getDatabase();
  const snapshot = await get(ref(db, "Reports"));

  if (!snapshot.exists()) {
    return { total: 0, open: 0, pending: 0, inProgress: 0 };
  }

  const data = snapshot.val() as Record<string, Record<string, Report>>;
  const now = Date.now();

  const rangeMap: Record<Exclude<TimeRange, "custom">, number> = {
    month: 30,
    "3month": 90,
    "6month": 180,
    year: 365,
  };

  // ✅ אם זה custom – נחשב cutoff לפי התאריכים
  let cutoff: number;

  if (timeRange === "custom" && startDate && endDate) {
    cutoff = startDate.getTime();
  } else {
    const days = rangeMap[timeRange as Exclude<TimeRange, "custom">];
    cutoff = now - days * 24 * 60 * 60 * 1000;
  }

  let total = 0;
  let open = 0;
  let pending = 0;
  let inProgress = 0;

  Object.values(data).forEach((group: Record<string, Report>) => {
    Object.values(group).forEach((report: Report) => {
      if (!report.timestamp) return;
      if(report.deleted) return;
      // ✅ אם זה custom – נבדוק טווח startDate עד endDate
      if (timeRange === "custom" && startDate && endDate) {
        if (report.timestamp < startDate.getTime() || report.timestamp > endDate.getTime())
          return;
      } else if (report.timestamp < cutoff) return;

      total++;
      const status = report.status?.toLowerCase();
      if (status === "open") open++;
      else if (status === "pending") pending++;
      else if (status === "in progress") inProgress++;
    });
  });

  return { total, open, pending, inProgress };
}


export async function fetchResolutionTimeData(
  timeRange: TimeRange,
  startDate?: Date,
  endDate?: Date)
: Promise<{ month: string; days: number }[]> {
  const db = getDatabase();
  const snapshot = await get(ref(db, "Reports"));
  if (!snapshot.exists()) return [];

  const data = snapshot.val() as Record<string, Record<string, Report>>;
  const now = Date.now();
  const rangeMap: Record<Exclude<TimeRange, "custom">, number> = {
    month: 30,
    "3month": 90,
    "6month": 180,
    year: 365,
  };
  
  let cutoff: number;

  if (timeRange === "custom" && startDate && endDate) {
    cutoff = startDate.getTime();
  } else {
    const days = rangeMap[timeRange as Exclude<TimeRange, "custom">];
    cutoff = now - days * 24 * 60 * 60 * 1000;
  }

  // נחשב ממוצע זמן פתרון לכל חודש
  const months: Record<string, { totalDays: number; count: number }> = {};

  Object.values(data).forEach((group) => {
    Object.values(group).forEach((r) => {
      if (r.deleted) return; //  דלג על דיווחים שנמחקו
      if (!r.timestamp || r.timestamp < cutoff) return;
      if (r.status?.toLowerCase() !== "resolved") return;
      if (!r.resolvedAt) return;

      const diffDays = (r.resolvedAt - r.timestamp) / (1000 * 60 * 60 * 24);
      const monthKey = new Date(r.timestamp).toLocaleString("en", { month: "short" });

      if (!months[monthKey]) months[monthKey] = { totalDays: 0, count: 0 };
      months[monthKey].totalDays += diffDays;
      months[monthKey].count++;
    });
  });

  return Object.entries(months).map(([month, d]) => ({
    month,
    days: +(d.totalDays / d.count).toFixed(1),
  }));
}

/**
 * מחזיר נתונים ליצירת גרף לפי קטגוריה וטווח זמן
 */
export type GraphTopic = "frequency" | "avgResolve" | "resolvedVsTotal" | "unresolved";
export type GraphPoint = { month: string; reports: number; resolved?: number; avgDays?: number };

/** עוזר: תחילת חודש (מילישניות) */
const startOfMonth = (t: number) => new Date(new Date(t).getFullYear(), new Date(t).getMonth(), 1).getTime();
/** עוזר: הוספת חודשים (מילישניות) */
const addMonths = (t: number, m: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + m, 1).getTime();
};

function monthKey(ts: number) {
  const d = new Date(ts);
  // YYYY-MM – מפתח יציב
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelHe(ts: number) {
  return new Intl.DateTimeFormat("he-IL", { month: "short" }).format(new Date(ts));
}

/** קבלת גבולות זמן לפי timeRange / custom */
export function getRangeBounds(
  timeRange: "month" | "3month" | "6month" | "year" | "custom",
  fromDate?: string,
  toDate?: string
) {
  const now = new Date();
  let start: number;
  let end: number;
  let monthsBack: number;

  if (timeRange === "custom" && fromDate && toDate) {
    // ✅ טווח מותאם אישית – בדיוק לפי הבחירה של המשתמש
    start = new Date(fromDate).getTime();
    end = new Date(toDate).setHours(23, 59, 59, 999);
    monthsBack = Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30))
    );
  } else {
    switch (timeRange) {
      case "month":
        monthsBack = 1;
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();
        break;
      case "3month":
        monthsBack = 3;
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime();
        end = now.getTime();
        break;
      case "6month":
        monthsBack = 6;
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime();
        end = now.getTime();
        break;
      case "year":
      default:
        monthsBack = 12;
        start = new Date(now.getFullYear() - 1, now.getMonth(), 1).getTime();
        end = now.getTime();
        break;
    }
  }

  return { start, end, monthsBack };
}

/**
 * מחזיר סדרת חודשים מלאה עבור הגרפים (כולל חודשים בלי נתונים).
 */
function buildEmptyMonthBuckets(timeRange: TimeRange) {
  const { start, end, monthsBack } = getRangeBounds(timeRange);
  const buckets: { key: string; label: string }[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const ts = addMonths(start, i);
    buckets.push({ key: monthKey(ts), label: monthLabelHe(ts) });
  }
  return { buckets, start, end };
}

/**
 * גרפים דינמיים – מחזיר תמיד את כל החודשים לפי טווח, עם 0 היכן שאין נתונים.
 */
export async function fetchGraphData(
  category: "garbage" | "lighting" | "tree",
  timeRange: TimeRange,
  topic: GraphTopic
): Promise<GraphPoint[]> {
  const db = getDatabase(app);
  const snap = await get(ref(db, "Reports"));
  if (!snap.exists()) return [];

  const data = snap.val() as Record<string, Record<string, Report>>;

  const { buckets, start, end } = buildEmptyMonthBuckets(timeRange);
  // טבלאות ביניים לצבירה
  const counters: Record<
    string,
    { reports: number; resolved: number; totalResolveDays: number; resolvedCount: number; unresolved: number }
  > = Object.fromEntries(
    buckets.map(b => [b.key, { reports: 0, resolved: 0, totalResolveDays: 0, resolvedCount: 0, unresolved: 0 }])
  );

  const catGroup = data[category] || {};
  Object.values(catGroup).forEach((r: Report) => {
    if (r.deleted) return; //אל תכלול דיווחים שנמחקו
    if (!r.timestamp) return;
    const t = Number(r.timestamp);
    if (t < start || t >= end) return; // מחוץ לטווח
    const k = monthKey(startOfMonth(t));
    const c = counters[k];
    if (!c) return; // לא אמור לקרות

    c.reports += 1;

    const status = (r.status || "").toLowerCase();
    if (status === "resolved" && r.resolvedAt) {
      c.resolved += 1;
      const days = (Number(r.resolvedAt) - t) / (1000 * 60 * 60 * 24);
      if (days >= 0) {
        c.totalResolveDays += days;
        c.resolvedCount += 1;
      }
    } else {
      c.unresolved += 1;
    }
  });

  // בניית הסדרה הסופית לפי ה־topic
  return buckets.map(({ key, label }) => {
    const c = counters[key];
    switch (topic) {
      case "frequency":
        return { month: label, reports: c.reports };
      case "avgResolve":
        return {
          month: label,
          reports: c.reports, // אופציונלי לשימוש אחר
          avgDays: c.resolvedCount ? +(c.totalResolveDays / c.resolvedCount).toFixed(1) : 0,
        };
      case "resolvedVsTotal":
        return { month: label, reports: c.reports, resolved: c.resolved };
      case "unresolved":
        return { month: label, reports: c.unresolved };
      default:
        return { month: label, reports: 0 };
    }
  });
}

/**
 * Fetches detailed statistics (areas & categories breakdown)
 */
export async function fetchDetailedStatistics(
  timeRange: TimeRange,
  fromDate?: string,
  toDate?: string
): Promise<DetailedStats | null> {
  const db = getDatabase(app);
  const snapshot = await get(ref(db, "Reports"));
  if (!snapshot.exists()) return null;

  const data = snapshot.val() as Record<string, Record<string, Report>>;

  // ✅ נחשב טווח זמן מדויק — כמו ב־StatisticsModal
  const now = Date.now();
  let start: number;
  let end: number;

  if (timeRange === "custom" && fromDate && toDate) {
    start = new Date(fromDate).getTime();
    end = new Date(toDate).setHours(23, 59, 59, 999);
  } else {
    // ❗ במקום חודש קלנדרי – נחשב חלון רץ של X ימים אחורה
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

  // ✅ נסנן רק דיווחים בטווח
  const reports: Report[] = Object.values(data)
    .flatMap((group) => Object.values(group))
    .filter(
      (r): r is Report => !r.deleted &&
        typeof r.timestamp === "number" &&
        r.timestamp >= start &&
        r.timestamp <= end
    );

  // ✅ אגרגציות לפי אזור וקטגוריה רק מתוך המסוננים
  const areaAgg: Record<
    string,
    { total: number; unresolved: number; resolved: number; sumDays: number; resolvedCount: number }
  > = {};

  const catAgg: Record<
    string,
    { sumDays: number; resolvedCount: number }
  > = {};

  for (const r of reports) {
    const area = r.area ?? "Unknown";
    areaAgg[area] ??= { total: 0, unresolved: 0, resolved: 0, sumDays: 0, resolvedCount: 0 };
    areaAgg[area].total += 1;

    const isResolved = r.status?.toLowerCase() === "resolved";
    if (isResolved) {
      areaAgg[area].resolved += 1;
      if (typeof r.resolvedAt === "number") {
        areaAgg[area].sumDays += (r.resolvedAt - r.timestamp) / (1000 * 60 * 60 * 24);
        areaAgg[area].resolvedCount += 1;
      }
    } else {
      areaAgg[area].unresolved += 1;
    }

    const cat = r.type ?? "other";
    catAgg[cat] ??= { sumDays: 0, resolvedCount: 0 };
    if (isResolved && typeof r.resolvedAt === "number") {
      catAgg[cat].sumDays += (r.resolvedAt - r.timestamp) / (1000 * 60 * 60 * 24);
      catAgg[cat].resolvedCount += 1;
    }
  }

  // ✅ גזירת רשימות מובילות (Top)
  const topAreas = Object.entries(areaAgg)
    .map(([area, s]) => ({
      area,
      total: s.total,
      unresolvedPercent: s.total ? ((s.unresolved / s.total) * 100).toFixed(1) : "0",
      avgResolveDays: s.resolvedCount ? (s.sumDays / s.resolvedCount).toFixed(1) : "—",
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const topUnresolvedAreas = [...topAreas]
    .sort((a, b) => parseFloat(b.unresolvedPercent) - parseFloat(a.unresolvedPercent))
    .slice(0, 5);

  const topAreasByResolveTime = Object.entries(areaAgg)
    .map(([area, s]) => ({
      area,
      total: s.total,
      unresolvedPercent: s.total
        ? ((s.unresolved / s.total) * 100).toFixed(1)
        : "0",
      avgResolveDays: s.resolvedCount
        ? (s.sumDays / s.resolvedCount).toFixed(1)
        : "—",
    }))
    .filter((x) => x.avgResolveDays !== "—")
    .sort((a, b) => parseFloat(b.avgResolveDays) - parseFloat(a.avgResolveDays))
    .slice(0, 5);

  const topCategoriesByResolveTime = Object.entries(catAgg)
    .map(([category, s]) => ({
      category,
      avgResolveDays: s.resolvedCount ? (s.sumDays / s.resolvedCount).toFixed(1) : "—",
    }))
    .filter((x) => x.avgResolveDays !== "—")
    .sort((a, b) => parseFloat(b.avgResolveDays) - parseFloat(a.avgResolveDays))
    .slice(0, 5);

  return {
    topAreas,
    topUnresolvedAreas,
    topAreasByResolveTime,
    topCategoriesByResolveTime,
  };
}

/** עדכון דיווח קיים ב־Realtime DB (עם ולידציה ו־logs) */
export async function updateReportInDB(
  reportType: string,
  reportId: string,
  partial: Partial<Report>
) {
  if (!reportType || !reportId) {
    throw new Error(`updateReportInDB: missing identifiers. type='${reportType}', id='${reportId}'`);
  }

  const db = getDatabase(app);
  const path = `Reports/${reportType}/${reportId}`;
  const nodeRef = ref(db, path);

  // בדיקת קיום לפני עדכון – יעזור לאיתור שגיאות בנתיב
  const exists = (await get(nodeRef)).exists();
  if (!exists) {
    throw new Error(`updateReportInDB: path not found: ${path}`);
  }

  console.log("[updateReportInDB] path:", path, "payload:", partial);
  await update(nodeRef, partial);
  return true;
}

/** מחיקה לוגית (מומלץ) */
export async function softDeleteReportInDB(
  reportType: string,
  reportId: string,
  deletedBy: string
) {
  const db = getDatabase(app);
  const path = `Reports/${reportType}/${reportId}`;
  const nodeRef = ref(db, path);

  const exists = (await get(nodeRef)).exists();
  if (!exists) {
    throw new Error(`softDeleteReportInDB: path not found: ${path}`);
  }


  // ✅ טיפוס ברור ובטוח
  const payload: Pick<Report, "deleted"> &
    Partial<Pick<Report, "deletedAt" | "deletedBy">> = {
    deleted: true,
    deletedAt: Date.now(),
    deletedBy,
  };

  console.log("[softDeleteReportInDB] path:", path, "payload:", payload);
  await update(nodeRef, payload);
  return true;
}

/** (לא חובה) מחיקה פיזית – פחות מומלץ לפרודקשן */
export async function hardDeleteReportInDB(reportType: string, reportId: string) {
  const db = getDatabase(app);
  const path = `Reports/${reportType}/${reportId}`;
  const nodeRef = ref(db, path);

  const exists = (await get(nodeRef)).exists();
  if (!exists) {
    throw new Error(`hardDeleteReportInDB: path not found: ${path}`);
  }

  console.log("[hardDeleteReportInDB] path:", path);
  await remove(nodeRef);
  return true;
}