//////////////////////////////////////////////working with firebase 

import express, { Request, Response } from "express";
import cors from "cors";

import { runAllDetectors } from "../lib/server/anomalyDetector";
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

// ✅ EXPORT ARCHIVED REPORTS
// app.post("/api/archive/export", exportArchivedReports);


async function runDetectionJob(): Promise<void> {
  console.log("🕒 Running anomaly detection job...");
  try {
    const reports = await getReportsForDetector();
    const anomalies = await runAllDetectors(reports);

    lastAnomalies = anomalies;

    // try {
    //   await saveOrUpdateAnomaliesToDB(anomalies);
    //   console.log("✅ Saved anomalies to DB successfully");
    // } catch (err) {
    //   console.error("❌ Failed to save anomalies to DB:", err);
    // }
    if (anomalies.length > 0) {
      console.log(`✅ ${anomalies.length} anomalies saved to Firebase`);
    } else {
      console.log("ℹ️ No anomalies detected at this run");
    }
  } catch (err) {
    console.error("❌ Error running detection job:", err);
  }
}

const mul = 3;
const DAY_MS =  60 * 1000 * mul ;
setInterval(runDetectionJob, DAY_MS);
runDetectionJob();
//setInterval(cleanupOldAnomalies, 1000 * 60 * 60 * 24);  24 hours
setInterval(cleanupOldAnomalies, 1000 * 60 * mul ); //

// ✅ דיווחים – פעם ביום
setInterval(archiveOldReports, 1000 * 60  * 1);
archiveOldReports();

const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));


//////////////////////////////////////////////working to file (for testing)

// import express, { Request, Response } from "express";
// import cors from "cors";
// import fs from "fs";
// import path from "path";

// import { runAllDetectors } from "./anomalyDetector";
// import { getReportsFromFirebase } from "./firebaseReader";
// import { Anomaly } from "./anomalyDetector/builders";


// const app = express();
// app.use(cors());
// app.use(express.json());

// let lastAnomalies: Anomaly[] = [];

// // הנתיב לקובץ שאליו נכתוב את התוצאות
// const anomaliesFilePath = path.join(__dirname, "lastAnomalies.json");

// app.get("/api/anomalies", (_req: Request, res: Response) => {
//   res.json(lastAnomalies);
// });

// async function runDetectionJob(): Promise<void> {
//   console.log("🕒 Running anomaly detection job...");
//   try {
//     const reports = await getReportsFromFirebase();
//     const anomalies = await runAllDetectors(reports);
//     lastAnomalies = anomalies;

//     // ✏️ נכתוב את התוצאות לקובץ JSON
//     fs.writeFileSync(
//       anomaliesFilePath,
//       JSON.stringify(
//         {
//           timestamp: new Date().toISOString(),
//           total: anomalies.length,
//           anomalies,
//         },
//         null,
//         2
//       ),
//       "utf-8"
//     );

//     if (anomalies.length > 0) {
//       console.log(`✅ ${anomalies.length} anomalies written to ${anomaliesFilePath}`);
//     } else {
//       console.log("ℹ️ No anomalies detected at this run");
//     }
//   } catch (err) {
//     console.error("❌ Error running detection job:", err);
//   }
// }

// // הפעלה ידנית/אוטומטית של החיפוש
// const DAY_MS = 24 * 60 * 60 * 1000;
// setInterval(runDetectionJob, DAY_MS);
// runDetectionJob();

// const PORT = 4000;
// app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
