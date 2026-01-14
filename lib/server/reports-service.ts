// lib/server/reports-service.ts
import { db } from "./firebase-admin";

// זה הטייפ שמנוע האנומליות צריך (מבוסס על firebaseReader.ts הישן)
export interface DetectorReport {
  id: string;
  type: string;
  area: string;
  timestamp: number;
  resolvedAt: number | undefined;
  deleted: boolean;
  lat?: number;
  lng?: number;
}

/**
 * מחזיר רשימת דיווחים במבנה "שטוח" עבור מנוע האנומליות,
 * במקום הפונקציה הישנה getReportsFromFirebase ב-firebaseReader.ts
 * 
 * New path structure: /Reports/ActiveReports/{city}/{type}/{id}
 */
export async function getReportsForDetector(): Promise<DetectorReport[]> {
  // 🔹 משתמשים ב-Firebase Admin במקום initializeApp / getDatabase
  const snapshot = await db.ref("Reports/ActiveReports").once("value");
  const raw = snapshot.val() || {};
  const out: DetectorReport[] = [];

  // New structure: Reports/ActiveReports/{city}/{type}/{id} -> { area, timestamp, lat, lng, status, deleted, ... }
  for (const city of Object.keys(raw)) {
    const cityData = raw[city];
    if (!cityData || typeof cityData !== "object") continue;

    for (const type of Object.keys(cityData)) {
      const group = cityData[type];
      if (!group || typeof group !== "object") continue;

      for (const id of Object.keys(group)) {
        const r = group[id];

        out.push({
          id,
          type,
          area: r.area ?? city,
          timestamp: Number(r.timestamp) || 0,
          deleted: Boolean(r.deleted),
          resolvedAt: r.resolvedAt ? Number(r.resolvedAt) : undefined,
          lat: typeof r.lat === "number" ? r.lat : undefined,
          lng: typeof r.lng === "number" ? r.lng : undefined,
        });
      }
    }
  }

  return out;
}



