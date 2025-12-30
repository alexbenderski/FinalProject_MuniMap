// Detector registry (runs all detectors)
// index.ts

import { detectHighActivity, Report } from "./detectHighActivity";
import { Anomaly } from "./builders";
import { detectSlowResolution } from "./detectSlowResolution";
import { detectSpatialClusters } from "./detectSpatialClusters";
import { saveFullAnomalySnapshot } from "./anomaly-storage";
import { notifyGarbageAnomalyManagers } from "../email-service";

// 👈 מאפשר גם סינכרוני וגם אסינכרוני
type Detector = (reports: Report[]) => Anomaly[] | Promise<Anomaly[]>;

// All registered detectors
const DETECTORS: Detector[] = [
  detectHighActivity,      // Time-based spike detection
  detectSlowResolution,    // SLA violation detection
  detectSpatialClusters,   // Geographic cluster detection
];

export async function runAllDetectors(reports: Report[]): Promise<Anomaly[]> {
  const results: Anomaly[] = [];

  for (const detector of DETECTORS) {
    const anomalies = await detector(reports);
    results.push(...anomalies);

    // 💾 שמירה מיידית של כל אנומליה — רק כאן!
    for (const anomaly of anomalies) {
      await saveFullAnomalySnapshot(anomaly);
      
      // 📧 שליחת התראת מייל למנהלי פסולת (רק אם זו אנומליית פסולת)
      await notifyGarbageAnomalyManagers(anomaly);
    }
    
  }

  return results;
}