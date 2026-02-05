// lib/server/firebase-admin.ts
import admin from "firebase-admin";
import path from "path";
import fs from "fs";

//to force ts-node to run server/.env file.
import dotenv from "dotenv";
dotenv.config({ path: "server/.env" });

console.log("💙 DEBUG: FIREBASE_DATABASE_URL =", process.env.FIREBASE_DATABASE_URL);

// Get database URL from environment or use a default for build time
const databaseURL = process.env.FIREBASE_DATABASE_URL || "https://munimap-c9082-default-rtdb.firebaseio.com";

// Initialize Firebase Admin only if not already initialized
if (!admin.apps.length) {
  try {
    let credential;

    // Check if we have service account credentials as environment variables (for Vercel/production)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      console.log("🔐 Using Firebase credentials from environment variables");
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "munimap-c9082",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      // Try to use local serviceAccountKey.json file (for local development)
      const serviceAccountPath = path.resolve(process.cwd(), "serviceAccountKey.json");
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log("📄 Using Firebase credentials from serviceAccountKey.json");
        credential = admin.credential.cert(serviceAccountPath);
      } else {
        throw new Error("No Firebase credentials found. Please set environment variables or provide serviceAccountKey.json");
      }
    }

    admin.initializeApp({
      credential: credential,
      databaseURL: databaseURL,
    });
    console.log("✅ Firebase Admin initialized successfully");
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
    throw error;
  }
}

export const db = admin.database();
export const auth = admin.auth();
export const storage = admin.storage();
export const adminFirestore = admin.firestore();