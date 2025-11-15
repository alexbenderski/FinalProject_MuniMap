//Pulls reports from Firebase
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, child } from "firebase/database";

//to run firebaseConfig process.env from .env from the server folder
import dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

// ⚠️ Fill your config:
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

/** Returns normalized list of reports the detectors need */
export async function getReportsFromFirebase() {
  const snapshot = await get(child(ref(db), "Reports"));
  const raw = snapshot.val() || {};
  const out = [];

  // expected structure: Reports/{type}/{id} -> { area, timestamp, lat, lng, status, deleted, ... }
  for (const type of Object.keys(raw)) {
    const group = raw[type];
    for (const id of Object.keys(group)) {
      const r = group[id];
      out.push({
        id,
        type,
        area: r.area ?? "—",
        timestamp: Number(r.timestamp) || 0,
        deleted: Boolean(r.deleted),
        lat: typeof r.lat === "number" ? r.lat : undefined,
        lng: typeof r.lng === "number" ? r.lng : undefined,
      });
    }
  }
  return out;
}