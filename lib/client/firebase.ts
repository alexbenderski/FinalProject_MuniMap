//firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, browserSessionPersistence, setPersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// ℹ️ These values are PUBLIC and safe to commit - Firebase API keys are not secrets
// They are restricted by Firebase Security Rules, not by hiding the key
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB4L2WLDT0VfLCsMDtCEDeVkZ954UEG8ZU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "munimap-c9082.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "munimap-c9082",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:699543006688:web:ea10805412027896664f85",
  storageBucket: "munimap-c9082.firebasestorage.app",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://munimap-c9082-default-rtdb.firebaseio.com/",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 🔐 Set session persistence - session clears when browser/tab is closed
// Combined with 5-minute inactivity timeout in AuthProvider
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error("Failed to set auth persistence:", error);
});

export const db = getDatabase(app); // ✅ Realtime DB
export const storage = getStorage(app); 



