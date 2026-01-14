import { db } from "../firebase-admin";
import { archiveAnomalyEpisode } from "../anomalyDetector/anomaly-storage";

const INACTIVE_DAYS = 7;
const INACTIVE_MS = INACTIVE_DAYS * 24 * 60 * 60 * 1000  ; // 7 days

export async function cleanupOldAnomalies() {
  const ref = db.ref("Anomalies/Active");
  const snap = await ref.once("value");

  if (!snap.exists()) return;

  const now = Date.now();
  const citiesData = snap.val();

  // Iterate through cities
  for (const city of Object.keys(citiesData)) {
    const anomalies = citiesData[city];
    if (!anomalies || typeof anomalies !== 'object') continue;

    for (const id of Object.keys(anomalies)) {
      const a = anomalies[id];

      if (now - a.lastUpdated  >= INACTIVE_MS) { //if inactive for more than 7 days than archive the episode
        await archiveAnomalyEpisode(id, city);
      }
    }
  }
}
