// lib/server/firebase-admin.ts
import admin from "firebase-admin";
import path from "path";

//to force ts-node to run server/.env file.
import dotenv from "dotenv";
dotenv.config({ path: "server/.env" });

console.log("💙 DEBUG: FIREBASE_DATABASE_URL =", process.env.FIREBASE_DATABASE_URL);
console.log("💙 DEBUG: SERVICE ACCOUNT PATH =", path.resolve(process.cwd(), "serviceAccountKey.json"));

// Get database URL from environment or use a default for build time
const databaseURL = process.env.FIREBASE_DATABASE_URL || "https://munimap-c9082-default-rtdb.firebaseio.com";

// Initialize Firebase Admin only if not already initialized
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(process.cwd(), "serviceAccountKey.json");

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      databaseURL: databaseURL,
    });
    console.log("✅ Firebase Admin initialized successfully");
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
    // During build time, we still initialize with a placeholder
    // This prevents build errors while still allowing runtime to work properly
  }
}

export const db = admin.database();
export const auth = admin.auth();
export const storage = admin.storage();
export const adminFirestore = admin.firestore();