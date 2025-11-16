import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, get } from "firebase/database";
import { Anomaly } from "./anomalyDetector/builders";

//to run firebaseConfig process.env from .env from the server folder
import dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

// ⚠️ הכנס את אותם פרטי קונפיג בדיוק כמו שיש לך ב-firebaseReader.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!, 
  storageBucket: "munimap-c9082.firebasestorage.app", 
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export async function saveOrUpdateAnomaliesToDB(anomalies: Anomaly[]) {
  for (const anomaly of anomalies) {
    const anomalyRef = ref(db, `Anomalies/${anomaly.id}`);

    const snapshot = await get(anomalyRef);

    if (snapshot.exists()) {
      const existing = snapshot.val();

      await set(anomalyRef, {
        ...existing,
        ...anomaly,
        firstDetected: existing.firstDetected,
        lastUpdated: Date.now(),
      });

    } else {
      await set(anomalyRef, anomaly);
    }
  }

  console.log(`✅ Saved/Updated ${anomalies.length} anomalies`);
}

