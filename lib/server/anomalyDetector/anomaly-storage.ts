// anomaly-storage.ts
import { AnomalyUpdateSnapshot } from "../../types";
import { db } from "../firebase-admin";
import { Anomaly } from "./builders";

// ─────────────────────────────────────────────
// יצירת מזהה עוקב: upd_0001, upd_0002...
// ─────────────────────────────────────────────
function nextUpdateId(list: string[]): string {
  if (list.length === 0) return "upd_0001";

  const nums = list
    .map(id => id.replace("upd_", ""))
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));

  const maxNum = Math.max(...nums);
  const next = (maxNum + 1).toString().padStart(4, "0");
  return `upd_${next}`;
}
////////////////////////////////////////////////////////////////


export async function loadActiveAnomaly(id: string): Promise<Anomaly | null> {
  const ref = db.ref(`Anomalies/ActiveAnomalies/${id}`);
  const snapshot = await ref.once("value");
  return snapshot.exists() ? snapshot.val() : null;
}


// ─────────────────────────────────────────────
// 1) שמירה תחת ActiveAnomalies/
// ─────────────────────────────────────────────
export async function saveActiveAnomaly(anomaly: Anomaly) {
  const ref = db.ref(`Anomalies/ActiveAnomalies/${anomaly.id}`);
  const snapshot = await ref.once("value");

  if (snapshot.exists()) {
    const existing = snapshot.val();

    await ref.set({
      ...existing,
      ...anomaly,
      firstDetected: existing.firstDetected,   // ← שומרים על המקור!
      lastUpdated: Date.now()
    });

    console.log(`🔄 Updated ActiveAnomalies/${anomaly.id}`);

  } else {
    await ref.set({
      ...anomaly,
      firstDetected: Date.now(),
      lastUpdated: Date.now()
    });

    console.log(`🆕 Created ActiveAnomalies/${anomaly.id}`);
  }
}

//─────────────────────────────────────────────

function pickWorstUpdate(updates: Record<string, AnomalyUpdateSnapshot>): AnomalyUpdateSnapshot | null {
  const snapshots = Object.values(updates);
  if (snapshots.length === 0) return null;

  return snapshots.reduce((worst, curr) => {
    return curr.metrics.currentAvgDays > worst.metrics.currentAvgDays
      ? curr
      : worst;
  });
}

//─────────────────────────────────────────────

function nextEpisodeId(list: string[]): string {
  if (list.length === 0) return "ep_0001";

  const nums = list
    .map(id => id.replace("ep_", ""))
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));

  const next = (Math.max(...nums) + 1).toString().padStart(4, "0");

  return `ep_${next}`;
}


//────────────────close episode─────────────────────────────

export async function archiveAnomalyEpisode(anomalyId: string) {
  const activeRef = db.ref(`Anomalies/ActiveAnomalies/${anomalyId}`);
  const updatesRef = db.ref(`Anomalies/ActiveAnomaliesUpdates/${anomalyId}`);
  const episodesRef = db.ref(`Anomalies/AnomalyEpisodes/${anomalyId}`);

  const activeSnap = await activeRef.once("value");
  const updatesSnap = await updatesRef.once("value");

  if (!activeSnap.exists() || !updatesSnap.exists()) return;

  const active = activeSnap.val();
  const updates = updatesSnap.val();

  const worst = pickWorstUpdate(updates);

  const existingEpisodes = await episodesRef.once("value");
  const episodeIds = existingEpisodes.exists() ? Object.keys(existingEpisodes.val()) : [];
  const newEpId = nextEpisodeId(episodeIds);

  const episodePayload = {
    startAt: active.firstDetected,
    endAt: active.lastUpdated,
    worstSnapshot: worst
  };

  await episodesRef.child(newEpId).set(episodePayload);

  console.log(`📦 Archived episode ${newEpId} for ${anomalyId}`);

  // ❗ מוחקים את כל העדכונים הקודמים
  await updatesRef.remove();

  // ❗ מוחקים את האנומליה הפעילה
  await activeRef.remove();

  console.log(`🧹 Cleaned ActiveAnomalies + Updates for ${anomalyId}`);
}

// ─────────────────────────────────────────────
// 2) שמירת Update Snapshot תחת ActiveAnomaliesUpdates/
// ─────────────────────────────────────────────
export async function saveAnomalyUpdateSnapshot(anomaly: Anomaly) {
  const listRef = db.ref(`Anomalies/ActiveAnomaliesUpdates/${anomaly.id}`);
  const snapshot = await listRef.once("value");

  const updates = snapshot.exists() ? snapshot.val() : {};
  const updateIds = Object.keys(updates);
  const newId = nextUpdateId(updateIds);

  const updatePayload = {
    timestamp: Date.now(),

    // ---- שדות כלליים ----
    id: anomaly.id,
    category: anomaly.category,
    area: anomaly.area,
    type: anomaly.type,
    status: anomaly.status,
    severity: anomaly.severity,

    title: anomaly.title,
    description: anomaly.description,
    generalMessage: anomaly.generalMessage || null,

    // ---- נתונים ----
    metrics: anomaly.metrics,
    relatedReports: anomaly.relatedReports,

    // ---- מיקום ----
    center: anomaly.center || null,

    // ---- תאריכים ----
    firstDetected: anomaly.firstDetected,
    lastUpdated: anomaly.lastUpdated
  };

  await listRef.child(newId).set(updatePayload);

  console.log(`📝 Saved FULL update snapshot ${newId} for anomaly ${anomaly.id}`);
}

export function mergeAnomalies(existing: Anomaly, update: Anomaly): Anomaly {
  return {
    ...existing,

    // ← לא מחליפים שדות "זהות"
    id: existing.id,
    category: existing.category,
    area: existing.area,
    type: existing.type,
    firstDetected: existing.firstDetected,
    status: existing.status,

    // ← כן מעדכנים שדות משתנים
    title: update.title,
    description: update.description,
    generalMessage: update.generalMessage,
    severity: update.severity,

    metrics: update.metrics,
    relatedReports: update.relatedReports,
    center: update.center ?? existing.center,

    lastUpdated: Date.now()
  };
}

// ─────────────────────────────────────────────
// 3) פונקציה מרכזית — שמירה מלאה
// ─────────────────────────────────────────────
export async function saveFullAnomalySnapshot(anomaly: Anomaly) {
  // 1) שימור / עדכון ב-ActiveAnomalies
  await saveActiveAnomaly(anomaly);

  // 2) משיכת העותק המעודכן מהמסד (כולל firstDetected ו-lastUpdated הנכונים)
  const updated = await loadActiveAnomaly(anomaly.id);

  if (!updated) {
    console.error("❌ Failed to load anomaly after saving:", anomaly.id);
    return;
  }

  // 3) שמירת snapshot בהתאם לערכים האמיתיים
  await saveAnomalyUpdateSnapshot(updated);

  console.log(`💾 Saved full snapshot for ${anomaly.id}`);
}