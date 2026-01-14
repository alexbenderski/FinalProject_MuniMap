import { app } from "./firebase";
import { getDatabase, ref, onValue } from "firebase/database";
import { Anomaly, DetailedStats, Report, TimeRange } from "@/lib/types";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db as firestoreDb } from "./firestore";

// ==================== HELPER FUNCTIONS ====================

/**
 * Returns current user email and safe key for database
 */
export function getCurrentUserInfo() {
  const auth = getAuth();
  const email = auth.currentUser?.email ?? null;
  const safeKey = email ? email.replace(/\./g, "_") : null;
  return { email, safeKey };
}

/**
 * Fetches the current user's authority from Firestore
 */
export async function fetchCurrentUserAuthority(): Promise<string> {
  const { safeKey } = getCurrentUserInfo();
  if (!safeKey) return "Municipal Worker";
  
  try {
    const userDocRef = doc(firestoreDb, "users", safeKey);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData?.authority || "Municipal Worker";
    }
  } catch (err) {
    console.warn("Could not fetch user authority:", err);
  }
  return "Municipal Worker";
}

// ==================== LOCAL FILE FETCHERS ====================

export async function fetchCitiesFromLocal() {
  const response = await fetch("/data/cities_municipal_boundaries.json");
  if (!response.ok) throw new Error("Failed to load file");
  return response.json();
}

// ==================== REPORTS API ====================

/**
 * Fetch all reports via server API
 */
export async function fetchReports() {
  const response = await fetch("/api/reports");
  if (!response.ok) throw new Error("Failed to fetch reports");
  return response.json();
}

/**
 * Delete a report (soft delete) via server API
 * @param reportType - The category/type of the report
 * @param reportId - The unique ID of the report
 * @param city - The city where the report belongs
 */
export async function deleteReport(reportType: string, reportId: string, city: string) {
  const { email } = getCurrentUserInfo();
  const response = await fetch("/api/reports", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportType,
      reportId,
      city,
      deletedBy: email || "unknown",
      hardDelete: false
    })
  });
  if (!response.ok) throw new Error("Failed to delete report");
  console.log(`Deleted report ${reportId}`);
}

/**
 * Update a report via server API
 * @param reportType - The category/type of the report
 * @param reportId - The unique ID of the report
 * @param city - The city where the report belongs
 * @param partial - The partial updates to apply
 */
export async function updateReportInDB(
  reportType: string,
  reportId: string,
  city: string,
  partial: Partial<Report>
) {
  if (!reportType || !reportId || !city) {
    throw new Error(`updateReportInDB: missing identifiers. type='${reportType}', id='${reportId}', city='${city}'`);
  }

  const response = await fetch("/api/reports", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportType,
      reportId,
      city,
      updates: partial
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update report");
  }

  console.log("[updateReportInDB] Updated:", reportType, reportId, city, partial);
  return true;
}

/**
 * Soft delete a report via server API
 * @param reportType - The category/type of the report
 * @param reportId - The unique ID of the report
 * @param city - The city where the report belongs
 * @param deletedBy - Email of user performing the deletion
 */
export async function softDeleteReportInDB(
  reportType: string,
  reportId: string,
  city: string,
  deletedBy: string
) {
  const response = await fetch("/api/reports", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportType,
      reportId,
      city,
      deletedBy,
      hardDelete: false
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to soft delete report");
  }

  console.log("[softDeleteReportInDB] Deleted:", reportType, reportId);
  return true;
}

/**
 * Hard delete a report via server API
 * @param reportType - The category/type of the report
 * @param reportId - The unique ID of the report
 * @param city - The city where the report belongs
 */
export async function hardDeleteReportInDB(reportType: string, reportId: string, city: string) {
  const response = await fetch("/api/reports", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportType,
      reportId,
      city,
      hardDelete: true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to hard delete report");
  }

  console.log("[hardDeleteReportInDB] Deleted:", reportType, reportId);
  return true;
}

// ==================== ANOMALIES API ====================

/**
 * Fetch all anomalies via server API
 */
export async function fetchAnomalies(): Promise<Anomaly[]> {
  try {
    const response = await fetch("/api/anomalies");
    if (!response.ok) throw new Error("Failed to fetch anomalies");
    return response.json();
  } catch (err) {
    console.error("Error fetching anomalies:", err);
    return [];
  }
}

/**
 * Mark anomaly as reviewed via server API
 */
export async function markAnomalyAsReviewed(anomaly: Anomaly) {
  const { email, safeKey } = getCurrentUserInfo();
  
  if (!email || !safeKey) {
    throw new Error("User not authenticated");
  }

  // Check if user already reviewed (client-side check first)
  const alreadyReviewed = anomaly.reviewedBy && anomaly.reviewedBy[safeKey];
  const existingTimestamp = alreadyReviewed ? anomaly.reviewedBy?.[safeKey] : null;

  if (!anomaly.firebaseKey) {
    throw new Error("Anomaly missing firebaseKey");
  }

  if (!anomaly.area) {
    throw new Error("Anomaly missing area (city)");
  }

  const response = await fetch("/api/anomalies", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firebaseKey: anomaly.firebaseKey,
      city: anomaly.area,
      userEmail: email,
      alreadyReviewed,
      existingTimestamp
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to mark anomaly as reviewed");
  }

  return response.json();
}

/**
 * Add comment to anomaly via server API
 */
export async function addAnomalyComment(anomaly: Anomaly, commentText: string) {
  const { email } = getCurrentUserInfo();
  
  if (!email) {
    throw new Error("User not authenticated");
  }

  if (!anomaly.firebaseKey) {
    throw new Error("Anomaly missing firebaseKey");
  }

  if (!anomaly.area) {
    throw new Error("Anomaly missing area (city)");
  }

  if (!commentText.trim()) {
    throw new Error("Comment text cannot be empty");
  }

  const response = await fetch("/api/anomalies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firebaseKey: anomaly.firebaseKey,
      city: anomaly.area,
      userEmail: email,
      commentText: commentText.trim()
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add comment");
  }

  return response.json();
}

/**
 * Add comment to report via server API
 * @param reportType - The category/type of the report
 * @param reportId - The unique ID of the report  
 * @param city - The city where the report belongs
 * @param commentText - The comment text to add
 */
export async function addReportComment(reportType: string, reportId: string, city: string, commentText: string) {
  const { email } = getCurrentUserInfo();
  
  if (!email) {
    throw new Error("User not authenticated");
  }

  if (!reportType || !reportId || !city) {
    throw new Error("Report missing type, id, or city");
  }

  if (!commentText.trim()) {
    throw new Error("Comment text cannot be empty");
  }

  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addComment",
      reportType,
      reportId,
      city,
      userEmail: email,
      commentText: commentText.trim()
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add comment");
  }

  return response.json();
}

// ==================== STATISTICS API ====================

/**
 * Fetch reports stats via server API
 */
export async function fetchReportsStats(
  timeRange: TimeRange,
  startDate?: Date,
  endDate?: Date
): Promise<{ total: number; open: number; pending: number; inProgress: number }> {
  const response = await fetch("/api/statistics/reports-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeRange,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString()
    })
  });

  if (!response.ok) {
    return { total: 0, open: 0, pending: 0, inProgress: 0 };
  }

  return response.json();
}

/**
 * Fetch resolution time data via server API
 */
export async function fetchResolutionTimeData(
  timeRange: TimeRange,
  startDate?: Date,
  endDate?: Date
): Promise<{ month: string; days: number }[]> {
  const response = await fetch("/api/statistics/resolution-time", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeRange,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString()
    })
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

/**
 * Graph data types
 */
export type GraphTopic = "frequency" | "avgResolve" | "resolvedVsTotal" | "unresolved";
export type GraphPoint = { month: string; reports: number; resolved?: number; avgDays?: number };

/**
 * Get range bounds for graphs (client-side utility)
 */
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
    start = new Date(fromDate).getTime();
    end = new Date(toDate).setHours(23, 59, 59, 999);
    monthsBack = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30)));
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
 * Fetch graph data via server API
 */
export async function fetchGraphData(
  category: "garbage" | "lighting" | "tree" | "hazard" | "animal" | "maintenance" | "pest",
  timeRange: TimeRange,
  topic: GraphTopic,
  fromDate?: string,
  toDate?: string
): Promise<GraphPoint[]> {
  const response = await fetch("/api/statistics/graph-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category,
      timeRange,
      topic,
      fromDate,
      toDate
    })
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

/**
 * Fetch detailed statistics via server API
 */
export async function fetchDetailedStatistics(
  timeRange: TimeRange,
  fromDate?: string,
  toDate?: string
): Promise<DetailedStats | null> {
  const response = await fetch("/api/statistics/detailed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeRange,
      fromDate,
      toDate
    })
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

// ==================== REAL-TIME LISTENERS ====================
// These remain as direct Firebase calls for real-time functionality
// but are READ-ONLY - all writes go through API routes

/**
 * Subscribe to real-time anomalies updates (READ-ONLY)
 * New path structure: /Anomalies/Active/{city}/{anomalyId}
 * @param callback Function to call when anomalies change
 * @returns Unsubscribe function
 */
export function subscribeToAnomalies(
  callback: (anomalies: Anomaly[]) => void
): () => void {
  const db = getDatabase(app);
  const anomaliesRef = ref(db, "Anomalies/Active");

  const unsubscribe = onValue(anomaliesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const citiesData = snapshot.val();
    const anomaliesArray: Anomaly[] = [];

    // Iterate through cities and collect all anomalies
    Object.values(citiesData).forEach((cityAnomalies: unknown) => {
      if (cityAnomalies && typeof cityAnomalies === 'object') {
        Object.entries(cityAnomalies).forEach(([firebaseKey, anomaly]) => {
          anomaliesArray.push({
            ...(anomaly as Anomaly),
            firebaseKey,
          });
        });
      }
    });

    callback(anomaliesArray);
  });

  return () => unsubscribe();
}

/**
 * Subscribe to real-time reports updates (READ-ONLY)
 * New path structure: /Reports/ActiveReports/{city}/{type}/{id}
 * @param callback Function to call when reports change
 * @returns Unsubscribe function
 */
export function subscribeToReports(
  callback: (reports: Record<string, Record<string, Omit<Report, "type" | "id">>>) => void
): () => void {
  const db = getDatabase(app);
  const reportsRef = ref(db, "Reports/ActiveReports");

  const unsubscribe = onValue(reportsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    const rawData = snapshot.val();
    // Structure: {city: {type: {id: report}}}
    
    // Flatten to old format: {type: {id: report}} (for backward compatibility with MapCanvas)
    const flatData: Record<string, Record<string, Omit<Report, "type" | "id">>> = {};

    Object.values(rawData).forEach((cityData: unknown) => {
      if (!cityData || typeof cityData !== 'object') return;
      
      Object.entries(cityData).forEach(([type, reportsGroup]) => {
        if (!reportsGroup || typeof reportsGroup !== 'object') return;
        
        if (!flatData[type]) {
          flatData[type] = {};
        }
        
        // Merge reports from all cities under same type
        Object.entries(reportsGroup as Record<string, unknown>).forEach(([id, report]) => {
          const reportData = report as Partial<Report>;
          if (reportData.deleted) return;
          flatData[type][id] = report as Omit<Report, "type" | "id">;
        });
      });
    });

    callback(flatData);
  });

  return () => unsubscribe();
}