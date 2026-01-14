/**
 * MuniMap Performance Load Test
 * 
 * Tests:
 * 1. Report burst load (60 reports/min for 3 minutes)
 * 2. Measures write latency
 * 3. Logs all results to files
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
const CONFIG = {
  reportsPerMinute: 60,
  durationMinutes: 3,
  totalReports: 180, // 60 * 3
  intervalMs: 1000, // 1 report per second for 60/min
};

// City bounds (Tel Aviv area)
const CITY_BOUNDS = {
  north: 32.15,
  south: 32.03,
  east: 34.82,
  west: 34.74,
};

// Report categories and statuses
const CATEGORIES = ["garbage", "lighting", "tree", "hazard"];
const STATUSES = ["open", "pending", "in progress"];
const AREAS = ["Tel Aviv", "Ramat Gan", "Givatayim", "Holon", "Bat Yam"];

const DESCRIPTIONS: Record<string, string[]> = {
  garbage: ["פח אשפה מלא", "אשפה מפוזרת", "פח שבור", "פסולת ברחוב"],
  lighting: ["עמוד תאורה לא עובד", "נורה שרופה", "תאורה מהבהבת", "חושך באזור"],
  tree: ["עץ נפל", "ענף מסוכן", "עץ חולה", "צורך בגיזום"],
  hazard: ["בור במדרכה", "מכסה ביוב פתוח", "מעקה שבור", "מפגע בטיחותי"],
};

// Results tracking
interface TestResults {
  testStart: Date;
  testEnd: Date | null;
  totalReportsInserted: number;
  failedInserts: number;
  writeTimes: number[];
  errors: string[];
  listenerReactionTimes: number[];
}

const results: TestResults = {
  testStart: new Date(),
  testEnd: null,
  totalReportsInserted: 0,
  failedInserts: 0,
  writeTimes: [],
  errors: [],
  listenerReactionTimes: [],
};

// Generate random report
function generateReport() {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  const area = AREAS[Math.floor(Math.random() * AREAS.length)];
  const descriptions = DESCRIPTIONS[category];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  const lat = CITY_BOUNDS.south + Math.random() * (CITY_BOUNDS.north - CITY_BOUNDS.south);
  const lng = CITY_BOUNDS.west + Math.random() * (CITY_BOUNDS.east - CITY_BOUNDS.west);
  
  const timestamp = Date.now();
  
  return {
    type: category,
    description,
    area,
    address: `רחוב ${Math.floor(Math.random() * 100)} ${area}`,
    lat,
    lng,
    status,
    timestamp,
    openedAt: timestamp,
    deleted: false,
    email: `test${Math.floor(Math.random() * 1000)}@test.com`,
    phone: `05${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    media: false,
    submittedBy: "LoadTestBot",
    updatedAt: timestamp,
    updatedBy: "LoadTestBot",
    statusHistory: [
      {
        status,
        updatedBy: "LoadTestBot",
        updatedAt: timestamp,
      },
    ],
  };
}

// Write single report and measure time
async function writeReport(): Promise<{ success: boolean; writeTimeMs: number; error?: string }> {
  const report = generateReport();
  const startTime = Date.now();
  
  try {
    // New path structure: /Reports/ActiveReports/{city}/{type}/{id}
    const city = report.area;
    const reportsRef = db.ref(`Reports/ActiveReports/${city}/${report.type}`);
    const newRef = reportsRef.push();
    await newRef.set(report);
    
    const writeTimeMs = Date.now() - startTime;
    return { success: true, writeTimeMs };
  } catch (error) {
    const writeTimeMs = Date.now() - startTime;
    return { 
      success: false, 
      writeTimeMs, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Setup listener to measure reaction time
const listenerStartTimes: Map<string, number> = new Map();
let listenerRef: admin.database.Reference | null = null;

function setupListener() {
  // New path structure: Listen to /Reports/ActiveReports
  listenerRef = db.ref("Reports/ActiveReports");
  
  listenerRef.on("child_changed", (snapshot) => {
    const reactionTime = Date.now();
    const key = snapshot.key;
    if (key) {
      // We track when new reports come in under each city
      results.listenerReactionTimes.push(reactionTime - results.testStart.getTime());
    }
  });
  
  // Also listen for new reports in each area
  AREAS.forEach(area => {
    CATEGORIES.forEach(category => {
      const categoryRef = db.ref(`Reports/ActiveReports/${area}/${category}`);
      categoryRef.on("child_added", (snapshot) => {
        const addedTime = Date.now();
        const data = snapshot.val();
        if (data && data.submittedBy === "LoadTestBot") {
          // Calculate time between when report was created and when listener received it
          const reactionTime = addedTime - data.timestamp;
          if (reactionTime > 0 && reactionTime < 60000) { // Sanity check
            results.listenerReactionTimes.push(reactionTime);
          }
        }
      });
    });
  });
  
  console.log("✅ Listener setup complete");
}

function cleanupListener() {
  if (listenerRef) {
    listenerRef.off();
  }
  AREAS.forEach(area => {
    CATEGORIES.forEach(category => {
      db.ref(`Reports/ActiveReports/${area}/${category}`).off();
    });
  });
}

// Main load test
async function runLoadTest() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("       MuniMap Performance Load Test");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`📅 Test Start: ${results.testStart.toISOString()}`);
  console.log(`🎯 Target: ${CONFIG.reportsPerMinute} reports/min for ${CONFIG.durationMinutes} minutes`);
  console.log(`📊 Total reports to insert: ${CONFIG.totalReports}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Setup listener
  setupListener();
  
  // Small delay to ensure listener is ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  let reportCount = 0;
  const testStartTime = Date.now();
  const testDurationMs = CONFIG.durationMinutes * 60 * 1000;
  
  console.log("🚀 Starting burst load test...\n");
  
  // Insert reports at configured rate
  while (reportCount < CONFIG.totalReports && (Date.now() - testStartTime) < testDurationMs + 5000) {
    const minuteStart = Date.now();
    const reportsThisMinute = Math.min(CONFIG.reportsPerMinute, CONFIG.totalReports - reportCount);
    
    console.log(`📤 Minute ${Math.floor(reportCount / CONFIG.reportsPerMinute) + 1}: Inserting ${reportsThisMinute} reports...`);
    
    for (let i = 0; i < reportsThisMinute; i++) {
      const result = await writeReport();
      
      if (result.success) {
        results.totalReportsInserted++;
        results.writeTimes.push(result.writeTimeMs);
      } else {
        results.failedInserts++;
        if (result.error) {
          results.errors.push(result.error);
        }
      }
      
      reportCount++;
      
      // Progress indicator every 10 reports
      if (reportCount % 10 === 0) {
        const avgWrite = results.writeTimes.length > 0 
          ? (results.writeTimes.reduce((a, b) => a + b, 0) / results.writeTimes.length).toFixed(1)
          : "N/A";
        process.stdout.write(`\r   Progress: ${reportCount}/${CONFIG.totalReports} | Avg write: ${avgWrite}ms`);
      }
      
      // Delay to achieve target rate (1 report per second for 60/min)
      if (i < reportsThisMinute - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.intervalMs));
      }
    }
    
    console.log(); // New line after progress
    
    const minuteElapsed = Date.now() - minuteStart;
    console.log(`   ⏱️ Minute completed in ${(minuteElapsed / 1000).toFixed(1)}s`);
    
    // If we finished early, wait for the minute to complete
    if (minuteElapsed < 60000 && reportCount < CONFIG.totalReports) {
      const waitTime = 60000 - minuteElapsed;
      console.log(`   ⏳ Waiting ${(waitTime / 1000).toFixed(1)}s for next minute...\n`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Wait a bit for final listener updates
  console.log("\n⏳ Waiting for listener updates to settle...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Cleanup
  cleanupListener();
  
  results.testEnd = new Date();
  
  // Calculate statistics
  const totalDuration = (results.testEnd.getTime() - results.testStart.getTime()) / 1000;
  const avgWriteTime = results.writeTimes.length > 0 
    ? results.writeTimes.reduce((a, b) => a + b, 0) / results.writeTimes.length 
    : 0;
  const minWriteTime = results.writeTimes.length > 0 ? Math.min(...results.writeTimes) : 0;
  const maxWriteTime = results.writeTimes.length > 0 ? Math.max(...results.writeTimes) : 0;
  const p95WriteTime = results.writeTimes.length > 0 
    ? results.writeTimes.sort((a, b) => a - b)[Math.floor(results.writeTimes.length * 0.95)] 
    : 0;
  
  const avgListenerReaction = results.listenerReactionTimes.length > 0
    ? results.listenerReactionTimes.reduce((a, b) => a + b, 0) / results.listenerReactionTimes.length
    : 0;
  
  const actualRate = results.totalReportsInserted / (totalDuration / 60);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                    TEST RESULTS");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`📅 Test End: ${results.testEnd.toISOString()}`);
  console.log(`⏱️ Total Duration: ${totalDuration.toFixed(1)} seconds`);
  console.log(`📊 Reports Inserted: ${results.totalReportsInserted}/${CONFIG.totalReports}`);
  console.log(`❌ Failed Inserts: ${results.failedInserts}`);
  console.log(`📈 Actual Rate: ${actualRate.toFixed(1)} reports/minute`);
  console.log(`\n⏱️ Write Latency:`);
  console.log(`   Average: ${avgWriteTime.toFixed(1)}ms`);
  console.log(`   Min: ${minWriteTime}ms`);
  console.log(`   Max: ${maxWriteTime}ms`);
  console.log(`   P95: ${p95WriteTime}ms`);
  console.log(`\n📡 Listener Reaction Time:`);
  console.log(`   Samples: ${results.listenerReactionTimes.length}`);
  console.log(`   Average: ${avgListenerReaction.toFixed(1)}ms`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Write results to files
  await writeResultFiles({
    totalDuration,
    avgWriteTime,
    minWriteTime,
    maxWriteTime,
    p95WriteTime,
    actualRate,
    avgListenerReaction,
  });
  
  // Exit
  process.exit(0);
}

// Write result files
async function writeResultFiles(stats: {
  totalDuration: number;
  avgWriteTime: number;
  minWriteTime: number;
  maxWriteTime: number;
  p95WriteTime: number;
  actualRate: number;
  avgListenerReaction: number;
}) {
  const outputDir = path.resolve(process.cwd(), "tests/performance/results");
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // File 1: load_test_results.txt
  const resultsContent = `
════════════════════════════════════════════════════════════════════════════════
                     MUNIMAP LOAD TEST RESULTS
════════════════════════════════════════════════════════════════════════════════

TEST CONFIGURATION
─────────────────────────────────────────────────────────────────────────────────
• Target Rate: ${CONFIG.reportsPerMinute} reports/minute
• Duration: ${CONFIG.durationMinutes} minutes
• Total Reports Target: ${CONFIG.totalReports}
• Interval: ${CONFIG.intervalMs}ms between reports

TEST TIMING
─────────────────────────────────────────────────────────────────────────────────
• Test Start: ${results.testStart.toISOString()}
• Test End: ${results.testEnd?.toISOString() || "N/A"}
• Total Duration: ${stats.totalDuration.toFixed(1)} seconds

INSERT STATISTICS
─────────────────────────────────────────────────────────────────────────────────
• Total Reports Inserted: ${results.totalReportsInserted}
• Failed Inserts: ${results.failedInserts}
• Success Rate: ${((results.totalReportsInserted / CONFIG.totalReports) * 100).toFixed(1)}%
• Actual Insert Rate: ${stats.actualRate.toFixed(1)} reports/minute

WRITE LATENCY (Database)
─────────────────────────────────────────────────────────────────────────────────
• Average: ${stats.avgWriteTime.toFixed(1)}ms
• Minimum: ${stats.minWriteTime}ms
• Maximum: ${stats.maxWriteTime}ms
• P95 (95th percentile): ${stats.p95WriteTime}ms

LISTENER REACTION TIMES
─────────────────────────────────────────────────────────────────────────────────
• Samples Collected: ${results.listenerReactionTimes.length}
• Average Reaction Time: ${stats.avgListenerReaction.toFixed(1)}ms

ERRORS (if any)
─────────────────────────────────────────────────────────────────────────────────
${results.errors.length > 0 ? results.errors.slice(0, 10).join("\n") : "No errors occurred"}
${results.errors.length > 10 ? `... and ${results.errors.length - 10} more errors` : ""}

════════════════════════════════════════════════════════════════════════════════
                          RAW DATA
════════════════════════════════════════════════════════════════════════════════

Write Times Distribution (ms):
${generateHistogram(results.writeTimes)}

════════════════════════════════════════════════════════════════════════════════
`;

  fs.writeFileSync(path.join(outputDir, "load_test_results.txt"), resultsContent);
  console.log(`✅ Results written to: ${path.join(outputDir, "load_test_results.txt")}`);

  // File 2: performance_summary.md
  const summaryContent = `# MuniMap Performance Test Summary

## Test Overview
| Parameter | Value |
|-----------|-------|
| Test Date | ${results.testStart.toISOString().split('T')[0]} |
| Duration | ${stats.totalDuration.toFixed(1)} seconds |
| Reports Inserted | ${results.totalReportsInserted}/${CONFIG.totalReports} |
| Target Rate | ${CONFIG.reportsPerMinute} reports/min |
| Achieved Rate | ${stats.actualRate.toFixed(1)} reports/min |

## Key Findings

### 1. Database Write Performance
| Metric | Value | Evaluation |
|--------|-------|------------|
| Average Write Time | ${stats.avgWriteTime.toFixed(1)}ms | ${stats.avgWriteTime < 100 ? "✅ Good" : stats.avgWriteTime < 300 ? "⚠️ Acceptable" : "❌ Problematic"} |
| P95 Write Time | ${stats.p95WriteTime}ms | ${stats.p95WriteTime < 200 ? "✅ Good" : stats.p95WriteTime < 500 ? "⚠️ Acceptable" : "❌ Problematic"} |
| Max Write Time | ${stats.maxWriteTime}ms | ${stats.maxWriteTime < 500 ? "✅ Good" : stats.maxWriteTime < 1000 ? "⚠️ Acceptable" : "❌ Problematic"} |
| Failed Writes | ${results.failedInserts} | ${results.failedInserts === 0 ? "✅ Good" : results.failedInserts < 5 ? "⚠️ Acceptable" : "❌ Problematic"} |

### 2. Real-time Listener Performance
| Metric | Value | Evaluation |
|--------|-------|------------|
| Avg Reaction Time | ${stats.avgListenerReaction.toFixed(1)}ms | ${stats.avgListenerReaction < 100 ? "✅ Good" : stats.avgListenerReaction < 500 ? "⚠️ Acceptable" : "❌ Problematic"} |
| Samples Collected | ${results.listenerReactionTimes.length} | - |

### 3. Throughput
| Metric | Value | Evaluation |
|--------|-------|------------|
| Target Rate | ${CONFIG.reportsPerMinute}/min | - |
| Achieved Rate | ${stats.actualRate.toFixed(1)}/min | ${stats.actualRate >= CONFIG.reportsPerMinute * 0.95 ? "✅ Good" : stats.actualRate >= CONFIG.reportsPerMinute * 0.8 ? "⚠️ Acceptable" : "❌ Problematic"} |
| Success Rate | ${((results.totalReportsInserted / CONFIG.totalReports) * 100).toFixed(1)}% | ${results.totalReportsInserted >= CONFIG.totalReports * 0.99 ? "✅ Good" : results.totalReportsInserted >= CONFIG.totalReports * 0.95 ? "⚠️ Acceptable" : "❌ Problematic"} |

## Parts That Handled Load Well
${stats.avgWriteTime < 100 ? "- ✅ Database writes maintained low latency under load\n" : ""}${results.failedInserts === 0 ? "- ✅ No failed writes - Firebase handled all requests\n" : ""}${stats.avgListenerReaction < 100 ? "- ✅ Real-time listeners responded quickly to changes\n" : ""}${stats.actualRate >= CONFIG.reportsPerMinute * 0.95 ? "- ✅ Target throughput was achieved\n" : ""}

## Parts That Showed Slowdown
${stats.avgWriteTime >= 300 ? "- ⚠️ Database write latency was high (avg: " + stats.avgWriteTime.toFixed(1) + "ms)\n" : ""}${stats.maxWriteTime >= 1000 ? "- ⚠️ Some writes experienced significant delays (max: " + stats.maxWriteTime + "ms)\n" : ""}${results.failedInserts > 0 ? "- ⚠️ " + results.failedInserts + " writes failed during the test\n" : ""}${stats.avgListenerReaction >= 500 ? "- ⚠️ Listener reaction times were slow (avg: " + stats.avgListenerReaction.toFixed(1) + "ms)\n" : ""}

## Overall Verdict

${getOverallVerdict(stats, results)}

---

## Notes
- Test was run against Firebase Realtime Database
- Reports were distributed across categories: garbage, lighting, tree, hazard
- Listener reaction time measures the delay between DB write and listener callback
- UI responsiveness tests require manual observation during load

*Report generated: ${new Date().toISOString()}*
`;

  fs.writeFileSync(path.join(outputDir, "performance_summary.md"), summaryContent);
  console.log(`✅ Summary written to: ${path.join(outputDir, "performance_summary.md")}`);
}

function generateHistogram(times: number[]): string {
  if (times.length === 0) return "No data";
  
  const buckets = [0, 50, 100, 200, 300, 500, 1000, Infinity];
  const counts: number[] = new Array(buckets.length - 1).fill(0);
  
  for (const time of times) {
    for (let i = 0; i < buckets.length - 1; i++) {
      if (time >= buckets[i] && time < buckets[i + 1]) {
        counts[i]++;
        break;
      }
    }
  }
  
  const maxCount = Math.max(...counts);
  const barWidth = 40;
  
  let result = "";
  for (let i = 0; i < counts.length; i++) {
    const label = buckets[i + 1] === Infinity 
      ? `${buckets[i]}ms+` 
      : `${buckets[i]}-${buckets[i + 1]}ms`;
    const bar = "█".repeat(Math.round((counts[i] / maxCount) * barWidth));
    result += `${label.padEnd(12)} | ${bar} (${counts[i]})\n`;
  }
  
  return result;
}

function getOverallVerdict(stats: {
  avgWriteTime: number;
  p95WriteTime: number;
  maxWriteTime: number;
  actualRate: number;
  avgListenerReaction: number;
}, results: TestResults): string {
  const issues: string[] = [];
  const goods: string[] = [];
  
  if (stats.avgWriteTime < 100) goods.push("fast writes");
  else if (stats.avgWriteTime >= 300) issues.push("slow writes");
  
  if (results.failedInserts === 0) goods.push("no failures");
  else issues.push("write failures");
  
  if (stats.avgListenerReaction < 100) goods.push("fast listeners");
  else if (stats.avgListenerReaction >= 500) issues.push("slow listeners");
  
  if (stats.actualRate >= CONFIG.reportsPerMinute * 0.95) goods.push("target rate achieved");
  else issues.push("below target rate");
  
  if (issues.length === 0) {
    return `### ✅ GOOD

The system performed excellently under the load test conditions:
- ${goods.join(", ")}

The MuniMap system can handle ${CONFIG.reportsPerMinute} reports/minute without degradation.`;
  } else if (issues.length <= 1) {
    return `### ⚠️ ACCEPTABLE

The system performed adequately with minor concerns:
- Strengths: ${goods.join(", ")}
- Areas to monitor: ${issues.join(", ")}

The system is functional but may benefit from optimization.`;
  } else {
    return `### ❌ NEEDS OPTIMIZATION

The system showed performance issues under load:
- Issues: ${issues.join(", ")}
- Working well: ${goods.length > 0 ? goods.join(", ") : "N/A"}

Consider investigating database connection pooling, query optimization, or infrastructure scaling.`;
  }
}

// Run the test
runLoadTest().catch(console.error);
