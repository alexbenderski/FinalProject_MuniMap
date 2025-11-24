// Detector registry (runs all detectors)

import { detectHighActivity, Report } from "./detectHighActivity";
import { Anomaly } from "./builders";
import { detectSlowResolution } from "./detectSlowResolution";

// כל פונקציה שמזהה אנומליות חייבת לקבל מערך של דיווחים (Report) ולהחזיר מערך של אנומליות (Anomaly)
type Detector = (reports: Report[]) => Anomaly[];

// בעתיד נוכל להוסיף כאן פונקציות נוספות כמו detectSlowResponse וכו'
const DETECTORS: Detector[] = [ detectSlowResolution];

export async function runAllDetectors(reports: Report[]): Promise<Anomaly[]> {
  const results: Anomaly[] = [];
  for (const detector of DETECTORS) {
    const res = detector(reports);
    results.push(...res);
  }
  return results;
}
