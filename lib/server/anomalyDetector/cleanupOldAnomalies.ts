import { db } from "../firebase-admin";
import { archiveAnomalyEpisode } from "../anomalyDetector/anomaly-storage";

const INACTIVE_DAYS = 1;
const INACTIVE_MS = INACTIVE_DAYS *60 * 1000; //2 minutes

export async function cleanupOldAnomalies() {
  const ref = db.ref("Anomalies/ActiveAnomalies");
  const snap = await ref.once("value");

  if (!snap.exists()) return;

  const now = Date.now();
  const anomalies = snap.val();

  for (const id of Object.keys(anomalies)) {
    const a = anomalies[id];

    if (now - a.lastUpdated  >= INACTIVE_MS) {
      await archiveAnomalyEpisode(id);
    }
  }
}
