// test-single-city.ts
// Quick test for single city seeding

import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("Testing single write to Firebase...\n");

  const serviceAccountPath = path.join(__dirname, "../../serviceAccountKey.json");
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

  try {
    admin.app();
  } catch {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
    });
  }

  const db = admin.database();

  const testReport = {
    city: "חיפה",
    area: "חיפה",
    type: "garbage",
    description: "בדיקה",
    street: "הרצל",
    status: "open",
    timestamp: Date.now(),
    lat: 32.7940,
    lng: 34.9896,
    imageUrl: "test.jpg",
    residentFirstName: "בדיקה",
    residentLastName: "בדיקה",
    deleted: false,
  };

  console.log("Writing test report...");
  const ref = db.ref("Reports/garbage").push();
  await ref.set(testReport);
  console.log(`✅ Written report with ID: ${ref.key}`);

  console.log("\nTest complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
