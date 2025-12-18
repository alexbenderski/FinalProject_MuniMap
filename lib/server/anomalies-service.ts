//anomalies-service.ts

import { db } from "./firebase-admin";
// import { Anomaly } from "@/lib/types";
import { Anomaly } from "./anomalyDetector/builders";

/**
 * העתק מדויק של saveOrUpdateAnomaliesToDB בקוד הישן,
 * רק מותאם ל-Firebase Admin במקום ל-Firebase Client.
 */
export async function saveOrUpdateAnomaliesToDB(anomalies: Anomaly[]) {
  for (const anomaly of anomalies) {
    const ref = db.ref(`Anomalies/${anomaly.id}`);
    const snapshot = await ref.once("value");

    if (snapshot.exists()) {
      const existing = snapshot.val();

      await ref.set({
        ...existing,
        ...anomaly,
        firstDetected: existing.firstDetected,
        lastUpdated: Date.now(),
      });

    } else {
      await ref.set(anomaly);
    }
  }

  console.log(`✅ Saved/Updated ${anomalies.length} anomalies`);
}

export async function getAnomaliesFromDB(): Promise<Anomaly[]> {
  const snapshot = await db.ref("Anomalies").once("value");
  if (!snapshot.exists()) return [];
  
  const anomaliesData = snapshot.val();
  return Object.values(anomaliesData) as Anomaly[];
}