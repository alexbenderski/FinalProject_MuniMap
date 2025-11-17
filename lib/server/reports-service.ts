// lib/server/reports-service.ts
import { db } from "./firebase-admin";

// זה הטייפ שמנוע האנומליות צריך (מבוסס על firebaseReader.ts הישן)
export interface DetectorReport {
  id: string;
  type: string;
  area: string;
  timestamp: number;
  deleted: boolean;
  lat?: number;
  lng?: number;
}

/**
 * מחזיר רשימת דיווחים במבנה "שטוח" עבור מנוע האנומליות,
 * במקום הפונקציה הישנה getReportsFromFirebase ב-firebaseReader.ts
 */
export async function getReportsForDetector(): Promise<DetectorReport[]> {
  // 🔹 משתמשים ב-Firebase Admin במקום initializeApp / getDatabase
  const snapshot = await db.ref("Reports").once("value");
  const raw = snapshot.val() || {};
  const out: DetectorReport[] = [];

  // expected structure: Reports/{type}/{id} -> { area, timestamp, lat, lng, status, deleted, ... }
  for (const type of Object.keys(raw)) {
    const group = raw[type];
    for (const id of Object.keys(group)) {
      const r = group[id];

      out.push({
        id,
        type,
        area: r.area ?? "—",
        timestamp: Number(r.timestamp) || 0,
        deleted: Boolean(r.deleted),
        lat: typeof r.lat === "number" ? r.lat : undefined,
        lng: typeof r.lng === "number" ? r.lng : undefined,
      });
    }
  }

  return out;
}



