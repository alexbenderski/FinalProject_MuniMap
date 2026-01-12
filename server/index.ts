import express, { Request, Response } from "express";
import cors from "cors";
import { runAllDetectors } from "../lib/server/anomalyDetector/index";
// import { getReportsFromFirebase } from "./firebaseReader"; //old
import {getReportsForDetector} from "../lib/server/reports-service"
 import { Anomaly } from "../lib/server/anomalyDetector/builders";
// import { saveOrUpdateAnomaliesToDB } from "./firebaseWriter";
import { cleanupOldAnomalies } from "../lib/server/anomalyDetector/cleanupOldAnomalies";
import { archiveOldReports } from "../lib/server/archive-reports";

const app = express();
app.use(cors());
app.use(express.json());
let lastAnomalies: Anomaly[] = [];

app.get("/api/anomalies", (_req: Request, res: Response) => {
  res.json(lastAnomalies);
});

// ✅ Manually trigger detection job
app.post("/api/run-detection", async (_req: Request, res: Response) => {
  console.log("🔄 Manual detection triggered...");
  await runDetectionJob();
  res.json({ success: true, anomalies: lastAnomalies.length });
});

// ✅ EXPORT ARCHIVED REPORTS
// app.post("/api/archive/export", exportArchivedReports);

async function runDetectionJob(): Promise<void> {
  console.log("🕒 Running anomaly detection job...");
  try {
    const reports = await getReportsForDetector();
    const anomalies = await runAllDetectors(reports);

    lastAnomalies = anomalies;


    if (anomalies.length > 0) {
      console.log(`✅ ${anomalies.length} anomalies saved to Firebase`);
    } else {
      console.log("ℹ️ No anomalies detected at this run");
    }
  } catch (err) {
    console.error("❌ Error running detection job:", err);
  }
}
const mul = 4;
const DAY_MS =  60 * 1000 * 60 * mul ; // 4 hours
setInterval(runDetectionJob, DAY_MS);
runDetectionJob();// Run on server start

// cleanup old anomalies – every 4 hours
setInterval(cleanupOldAnomalies, 1000 * 60 * mul ); // every 4 hours

// archive old reports – every 24 hours
setInterval(archiveOldReports, 1000 * 60  * 60 * 24);// every 24 hours
archiveOldReports();

const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

