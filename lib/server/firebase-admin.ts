// lib/server/firebase-admin.ts
import admin from "firebase-admin";
import path from "path";

//to force ts-node to run server/.env file.
import dotenv from "dotenv";
dotenv.config({ path: "server/.env" });

console.log("💙 DEBUG: FIREBASE_DATABASE_URL =", process.env.FIREBASE_DATABASE_URL);
console.log("💙 DEBUG: SERVICE ACCOUNT PATH =", path.resolve(process.cwd(), "serviceAccountKey.json"));


// מוודא שלא מאתחלים את ADMIN פעמיים
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(process.cwd(), "serviceAccountKey.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    databaseURL: process.env.FIREBASE_DATABASE_URL, // חובה להוסיף ב־.env
  });
}

export const db = admin.database();
export const auth = admin.auth();