// clear-firebase-data.ts
// Script to clear all reports and anomalies from Firebase

import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║     🗑️  Clear Firebase Data                        ║");
  console.log("║     ⚠️  THIS WILL DELETE ALL REPORTS & ANOMALIES   ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  const serviceAccountPath = path.join(__dirname, "../../serviceAccountKey.json");

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error("❌ serviceAccountKey.json not found");
  }

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

  console.log("🗑️  Deleting Reports...");
  await db.ref("Reports").remove();
  console.log("✅ Reports deleted");

  console.log("🗑️  Deleting ArchivedReports...");
  await db.ref("ArchivedReports").remove();
  console.log("✅ ArchivedReports deleted");

  console.log("🗑️  Deleting Anomalies...");
  await db.ref("Anomalies").remove();
  console.log("✅ Anomalies deleted");

  console.log("\n✅ All data cleared!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
