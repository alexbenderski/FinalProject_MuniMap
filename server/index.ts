//////////////////////////////////////////////working with firebase 

// import express, { Request, Response } from "express";
// import cors from "cors";
// import { runAllDetectors } from "./anomalyDetector/anomaly_index";
// import { getReportsFromFirebase } from "./firebaseReader";
// import { saveAnomaliesToFirebase } from "./firebaseWriter"; 
// import { Anomaly } from "./anomalyDetector/builders";

// const app = express();
// app.use(cors());
// app.use(express.json());

// let lastAnomalies: Anomaly[] = [];

// app.get("/api/anomalies", (_req: Request, res: Response) => {
//   res.json(lastAnomalies);
// });

// async function runDetectionJob() {
//   console.log("🕒 Running anomaly detection job...");
//   try {
//     const reports = await getReportsFromFirebase();
//     const anomalies = await runAllDetectors(reports);
//     lastAnomalies = anomalies;

//     if (anomalies.length > 0) {
//       await saveAnomaliesToFirebase(anomalies); // 👈 שמירה למסד
//     } else {
//       console.log("ℹ️ No anomalies detected at this run");
//     }

//     console.log(`✅ ${anomalies.length} anomalies processed at ${new Date().toLocaleString("he-IL")}`);
//   } catch (err) {
//     console.error("❌ Error running detection job:", err);
//   }
// }

// // ירוץ כל יום
// const DAY_MS = 24 * 60 * 60 * 1000;
// setInterval(runDetectionJob, DAY_MS);
// runDetectionJob();

// const PORT = 4000;
// app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));



//////////////////////////////////////////////working to file (for testing)

import express, { Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

import { runAllDetectors } from "./anomalyDetector";
import { getReportsFromFirebase } from "./firebaseReader";
import { Anomaly } from "./anomalyDetector/builders";


const app = express();
app.use(cors());
app.use(express.json());

let lastAnomalies: Anomaly[] = [];

// הנתיב לקובץ שאליו נכתוב את התוצאות
const anomaliesFilePath = path.join(__dirname, "lastAnomalies.json");

app.get("/api/anomalies", (_req: Request, res: Response) => {
  res.json(lastAnomalies);
});

async function runDetectionJob(): Promise<void> {
  console.log("🕒 Running anomaly detection job...");
  try {
    const reports = await getReportsFromFirebase();
    const anomalies = await runAllDetectors(reports);
    lastAnomalies = anomalies;

    // ✏️ נכתוב את התוצאות לקובץ JSON
    fs.writeFileSync(
      anomaliesFilePath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          total: anomalies.length,
          anomalies,
        },
        null,
        2
      ),
      "utf-8"
    );

    if (anomalies.length > 0) {
      console.log(`✅ ${anomalies.length} anomalies written to ${anomaliesFilePath}`);
    } else {
      console.log("ℹ️ No anomalies detected at this run");
    }
  } catch (err) {
    console.error("❌ Error running detection job:", err);
  }
}

// הפעלה ידנית/אוטומטית של החיפוש
const DAY_MS = 24 * 60 * 60 * 1000;
setInterval(runDetectionJob, DAY_MS);
runDetectionJob();

const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
