import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push } from "firebase/database";
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

/**
 * שומר אנומליות חדשות תחת Anomalies/
 * כל אנומליה תקבל מפתח ייחודי אוטומטי
 */
export async function saveAnomaliesToFirebase(anomalies: Anomaly[]): Promise<void> {
  try {
    const refPath = ref(db, "Anomalies");
    for (const anomaly of anomalies) {
      const newRef = push(refPath);
      await set(newRef, anomaly);
    }
    console.log(`✅ Saved ${anomalies.length} anomalies to Firebase`);
  } catch (err) {
    console.error("❌ Error saving anomalies:", err);
  }
}
