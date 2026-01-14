/**
 * MuniMap Listener Latency Test
 * 
 * Specifically measures the time between writing to Firebase 
 * and receiving the listener callback
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(process.cwd(), "serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    databaseURL: "https://munimap-c9082-default-rtdb.firebaseio.com",
  });
}

const db = admin.database();

// Test configuration
const TEST_REPORTS = 20;

interface LatencyResult {
  writeTime: number;
  listenerTime: number;
  latency: number;
}

const results: LatencyResult[] = [];

async function measureListenerLatency() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("       Listener Latency Test");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Testing ${TEST_REPORTS} individual writes with listener measurement\n`);

  const testCategory = "garbage";
  const testCity = "Test Area";
  // New path structure: /Reports/ActiveReports/{city}/{category}
  const categoryRef = db.ref(`Reports/ActiveReports/${testCity}/${testCategory}`);
  
  // Track pending writes
  const pendingWrites = new Map<string, number>();
  
  // Setup listener before writing
  categoryRef.on("child_added", (snapshot) => {
    const receivedTime = Date.now();
    const key = snapshot.key;
    const data = snapshot.val();
    
    if (key && data && data.submittedBy === "LatencyTestBot") {
      const writeTime = pendingWrites.get(key);
      if (writeTime) {
        const latency = receivedTime - writeTime;
        results.push({
          writeTime,
          listenerTime: receivedTime,
          latency,
        });
        pendingWrites.delete(key);
        console.log(`   📡 Report ${results.length}: Listener latency = ${latency}ms`);
      }
    }
  });

  // Wait for listener to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log("🚀 Starting writes...\n");

  // Write reports one by one and measure
  for (let i = 0; i < TEST_REPORTS; i++) {
    const report = {
      type: testCategory,
      description: `Latency test report ${i + 1}`,
      area: "Test Area",
      address: `Test Street ${i}`,
      lat: 32.08 + Math.random() * 0.05,
      lng: 34.78 + Math.random() * 0.05,
      status: "open",
      timestamp: Date.now(),
      openedAt: Date.now(),
      deleted: false,
      email: "test@test.com",
      phone: "0501234567",
      media: false,
      submittedBy: "LatencyTestBot",
      updatedAt: Date.now(),
      updatedBy: "LatencyTestBot",
      statusHistory: [{ status: "open", updatedBy: "LatencyTestBot", updatedAt: Date.now() }],
    };

    const newRef = categoryRef.push();
    const key = newRef.key!;
    const writeStartTime = Date.now();
    
    // Track this write
    pendingWrites.set(key, writeStartTime);
    
    await newRef.set(report);
    const writeEndTime = Date.now();
    
    console.log(`   ✏️ Write ${i + 1}: ${writeEndTime - writeStartTime}ms`);
    
    // Wait between writes
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Wait for remaining listener callbacks
  console.log("\n⏳ Waiting for remaining listener callbacks...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Cleanup
  categoryRef.off();
  
  // Calculate stats
  if (results.length > 0) {
    const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    const minLatency = Math.min(...results.map(r => r.latency));
    const maxLatency = Math.max(...results.map(r => r.latency));
    const sortedLatencies = results.map(r => r.latency).sort((a, b) => a - b);
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("                 LISTENER LATENCY RESULTS");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`📊 Samples: ${results.length}`);
    console.log(`⏱️ Average Latency: ${avgLatency.toFixed(1)}ms`);
    console.log(`   Minimum: ${minLatency}ms`);
    console.log(`   Maximum: ${maxLatency}ms`);
    console.log(`   P95: ${p95Latency}ms`);
    console.log("═══════════════════════════════════════════════════════════\n");
    
    // Update the results file
    const outputDir = path.resolve(process.cwd(), "tests/performance/results");
    const content = `
LISTENER LATENCY TEST RESULTS
═════════════════════════════════════════════════════════════════════════════

Test Date: ${new Date().toISOString()}
Samples: ${results.length}

Average Latency: ${avgLatency.toFixed(1)}ms
Minimum: ${minLatency}ms
Maximum: ${maxLatency}ms
P95 (95th percentile): ${p95Latency}ms

Individual Results:
${results.map((r, i) => `  ${i + 1}. ${r.latency}ms`).join('\n')}

Evaluation: ${avgLatency < 100 ? "✅ Good" : avgLatency < 500 ? "⚠️ Acceptable" : "❌ Problematic"}
`;
    
    fs.appendFileSync(
      path.join(outputDir, "load_test_results.txt"),
      content
    );
    
    console.log("✅ Results appended to load_test_results.txt");
    
    return { avgLatency, minLatency, maxLatency, p95Latency };
  }
  
  console.log("❌ No listener callbacks received");
  return null;
}

measureListenerLatency()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
