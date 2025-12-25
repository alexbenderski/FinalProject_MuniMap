// test-email.ts - Manual test script for email notifications
// Run with: ts-node --project server/tsconfig.server.json test-email.ts

// Initialize Firebase Admin first!
import "./lib/server/firebase-admin";
import { notifyGarbageAnomalyManagers } from "./lib/server/email-service";
import { Anomaly } from "./lib/server/anomalyDetector/builders";

// Create a test garbage anomaly
const testAnomaly: Anomaly = {
  id: "test_anom_garbage_jerusalem_spike",
  category: "garbage",
  type: "spike",
  area: "ירושלים",
  title: "ריבוי דיווחי garbage באזור ירושלים",
  description: "נמצאו 45 דיווחים בחודש הנוכחי מול ממוצע 20.5 (Z=3.2, +119%).",
  generalMessage: "זוהתה עלייה חדה בדיווחי garbage באזור ירושלים. החודש נרשמו 45 דיווחים מול ממוצע היסטורי של 20.5",
  metrics: {
    currentReports: 45,
    baselineMean: 20.5,
    baselineStd: 8.2,
    threshold: 37,
    pctChange: 119,
    zScore: 3.2,
  },
  relatedReports: ["rep1", "rep2", "rep3"],
  severity: "high",
  status: "open",
  firstDetected: Date.now(),
  lastUpdated: Date.now(),
  center: null,
};

async function testEmailNotification() {
  console.log("🧪 Testing Email Notification System");
  console.log("=====================================\n");

  console.log("Test Anomaly Details:");
  console.log(`- ID: ${testAnomaly.id}`);
  console.log(`- Category: ${testAnomaly.category}`);
  console.log(`- Type: ${testAnomaly.type}`);
  console.log(`- Area: ${testAnomaly.area}`);
  console.log(`- Severity: ${testAnomaly.severity}`);
  console.log("");

  console.log("Attempting to send email notification...\n");

  try {
    await notifyGarbageAnomalyManagers(testAnomaly);
    console.log("\n✅ Test completed successfully!");
    console.log("Check the console logs above for details about:");
    console.log("  - Number of managers found");
    console.log("  - Email addresses");
    console.log("  - Send status");
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
  }
}

// Run the test
testEmailNotification()
  .then(() => {
    console.log("\n🏁 Test script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unexpected error:");
    console.error(error);
    process.exit(1);
  });
