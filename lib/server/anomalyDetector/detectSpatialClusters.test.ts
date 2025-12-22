// TEST FILE: detectSpatialClusters.test.ts
// Demonstrates spatial anomaly detection with various scenarios

import { detectSpatialClusters } from "./detectSpatialClusters";
import { Report } from "./detectSpatialClusters";

// ============================================================================
// HELPER: Generate Test Reports
// ============================================================================

function generateReport(
  id: string,
  lat: number,
  lng: number,
  type: string,
  area: string,
  timestamp: number
): Report {
  return {
    id,
    type,
    area,
    timestamp,
    lat,
    lng,
    deleted: false,
  };
}

/**
 * Generate clustered reports in a small geographic area
 */
function generateClusteredReports(
  centerLat: number,
  centerLng: number,
  count: number,
  radiusDegrees: number,
  type: string,
  area: string,
  monthsAgo: number = 0
): Report[] {
  const reports: Report[] = [];
  const now = Date.now();
  const timestamp = now - monthsAgo * 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    // Random point within radius
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.random() * radiusDegrees;
    const lat = centerLat + r * Math.cos(angle);
    const lng = centerLng + r * Math.sin(angle);

    reports.push(
      generateReport(`report_${i}_m${monthsAgo}`, lat, lng, type, area, timestamp)
    );
  }

  return reports;
}

/**
 * Generate uniformly distributed reports across large area
 */
function generateRandomReports(
  centerLat: number,
  centerLng: number,
  count: number,
  spreadDegrees: number,
  type: string,
  area: string
): Report[] {
  const reports: Report[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const lat = centerLat + (Math.random() - 0.5) * spreadDegrees;
    const lng = centerLng + (Math.random() - 0.5) * spreadDegrees;

    reports.push(generateReport(`random_${i}`, lat, lng, type, area, now));
  }

  return reports;
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║     SPATIAL ANOMALY DETECTION - TEST SCENARIOS                ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

// ----------------------------------------------------------------------------
// SCENARIO 1: Dense Cluster (Should Detect)
// ----------------------------------------------------------------------------
console.log("📍 SCENARIO 1: Dense Cluster Detection");
console.log("   Expected: 1 spatial anomaly detected");
console.log("   Setup: 20 garbage reports in 300m radius vs. historical avg of 3\n");

const scenario1Reports: Report[] = [
  // Historical data (6 months): low activity
  ...generateClusteredReports(32.0850, 34.7805, 3, 0.003, "garbage", "Tel Aviv", 5),
  ...generateClusteredReports(32.0850, 34.7805, 2, 0.003, "garbage", "Tel Aviv", 4),
  ...generateClusteredReports(32.0850, 34.7805, 4, 0.003, "garbage", "Tel Aviv", 3),
  ...generateClusteredReports(32.0850, 34.7805, 3, 0.003, "garbage", "Tel Aviv", 2),
  ...generateClusteredReports(32.0850, 34.7805, 2, 0.003, "garbage", "Tel Aviv", 1),

  // Current month: SPIKE
  ...generateClusteredReports(32.0850, 34.7805, 20, 0.003, "garbage", "Tel Aviv", 0),
];

const anomalies1 = detectSpatialClusters(scenario1Reports);
console.log(`✅ Result: ${anomalies1.length} anomaly detected`);
if (anomalies1.length > 0) {
  console.log(`   Type: ${anomalies1[0].type}`);
  console.log(`   Category: ${anomalies1[0].category}`);
  console.log(`   Area: ${anomalies1[0].area}`);
  console.log(`   Severity: ${anomalies1[0].severity}`);
  console.log(`   Reports: ${anomalies1[0].metrics.totalReports}`);
  console.log(`   Radius: ${anomalies1[0].metrics.radiusMeters}m`);
  console.log(`   Z-Score: ${anomalies1[0].metrics.maxZScore}`);
  console.log(`   Centroid: (${anomalies1[0].center?.lat.toFixed(4)}, ${anomalies1[0].center?.lng.toFixed(4)})`);
}
console.log("\n" + "─".repeat(70) + "\n");

// ----------------------------------------------------------------------------
// SCENARIO 2: Sparse Distribution (Should NOT Detect)
// ----------------------------------------------------------------------------
console.log("📍 SCENARIO 2: Sparse Distribution (No Anomaly)");
console.log("   Expected: 0 spatial anomalies");
console.log("   Setup: 20 reports spread across 5km (no local concentration)\n");

const scenario2Reports: Report[] = [
  // Historical data: similar sparse pattern
  ...generateRandomReports(32.0850, 34.7805, 15, 0.05, "lighting", "Tel Aviv"),

  // Current: also sparse
  ...generateRandomReports(32.0850, 34.7805, 20, 0.05, "lighting", "Tel Aviv"),
];

const anomalies2 = detectSpatialClusters(scenario2Reports);
console.log(`✅ Result: ${anomalies2.length} anomalies detected (expected 0)`);
console.log("\n" + "─".repeat(70) + "\n");

// ----------------------------------------------------------------------------
// SCENARIO 3: Multiple Separate Clusters (Should Detect Multiple)
// ----------------------------------------------------------------------------
console.log("📍 SCENARIO 3: Multiple Separate Geographic Clusters");
console.log("   Expected: 2 spatial anomalies");
console.log("   Setup: One cluster in North (32.09, 34.78), one in South (32.07, 34.77)\n");

const scenario3Reports: Report[] = [
  // Historical: low activity in both areas
  ...generateClusteredReports(32.090, 34.780, 3, 0.003, "tree", "North District", 5),
  ...generateClusteredReports(32.090, 34.780, 2, 0.003, "tree", "North District", 4),
  ...generateClusteredReports(32.090, 34.780, 3, 0.003, "tree", "North District", 3),
  ...generateClusteredReports(32.090, 34.780, 2, 0.003, "tree", "North District", 2),
  ...generateClusteredReports(32.090, 34.780, 3, 0.003, "tree", "North District", 1),

  ...generateClusteredReports(32.070, 34.770, 2, 0.003, "hazard", "South District", 5),
  ...generateClusteredReports(32.070, 34.770, 3, 0.003, "hazard", "South District", 4),
  ...generateClusteredReports(32.070, 34.770, 2, 0.003, "hazard", "South District", 3),
  ...generateClusteredReports(32.070, 34.770, 2, 0.003, "hazard", "South District", 2),
  ...generateClusteredReports(32.070, 34.770, 3, 0.003, "hazard", "South District", 1),

  // Current: SPIKES in both areas
  ...generateClusteredReports(32.090, 34.780, 18, 0.003, "tree", "North District", 0),
  ...generateClusteredReports(32.070, 34.770, 15, 0.003, "hazard", "South District", 0),
];

const anomalies3 = detectSpatialClusters(scenario3Reports);
console.log(`✅ Result: ${anomalies3.length} anomalies detected`);
anomalies3.forEach((a, idx) => {
  console.log(`\n   Anomaly ${idx + 1}:`);
  console.log(`   - Category: ${a.category}`);
  console.log(`   - Area: ${a.area}`);
  console.log(`   - Reports: ${a.metrics.totalReports}`);
  console.log(`   - Centroid: (${a.center?.lat.toFixed(4)}, ${a.center?.lng.toFixed(4)})`);
  console.log(`   - Severity: ${a.severity}`);
});
console.log("\n" + "─".repeat(70) + "\n");

// ----------------------------------------------------------------------------
// SCENARIO 4: Isolated Single Report (Should NOT Detect - Noise Filter)
// ----------------------------------------------------------------------------
console.log("📍 SCENARIO 4: Isolated Single Report (Noise Filter)");
console.log("   Expected: 0 anomalies");
console.log("   Setup: 1 report in normally quiet area (fails minimum threshold)\n");

const scenario4Reports: Report[] = [
  // Historical: zero activity
  // (empty)

  // Current: single outlier
  generateReport("outlier_1", 32.100, 34.800, "animal", "Remote Area", Date.now()),
];

const anomalies4 = detectSpatialClusters(scenario4Reports);
console.log(`✅ Result: ${anomalies4.length} anomalies (expected 0 - below minimum threshold)`);
console.log("\n" + "─".repeat(70) + "\n");

// ----------------------------------------------------------------------------
// SCENARIO 5: Spatially Inconsistent Spike (Should Filter Out)
// ----------------------------------------------------------------------------
console.log("📍 SCENARIO 5: Spatially Inconsistent Spike");
console.log("   Expected: 0 anomalies");
console.log("   Setup: One cell with spike, but all neighbors have zero activity\n");

const scenario5Reports: Report[] = [
  // Historical: low activity in one specific cell
  ...generateClusteredReports(32.085, 34.780, 2, 0.001, "maintenance", "Center", 5),
  ...generateClusteredReports(32.085, 34.780, 2, 0.001, "maintenance", "Center", 4),
  ...generateClusteredReports(32.085, 34.780, 3, 0.001, "maintenance", "Center", 3),
  ...generateClusteredReports(32.085, 34.780, 2, 0.001, "maintenance", "Center", 2),
  ...generateClusteredReports(32.085, 34.780, 2, 0.001, "maintenance", "Center", 1),

  // Current: spike in that one cell only (0.001° radius = ~100m, very tight)
  ...generateClusteredReports(32.085, 34.780, 15, 0.001, "maintenance", "Center", 0),

  // Neighbors: completely empty (no supporting evidence)
  // This creates spatial inconsistency - rejected by validation
];

const anomalies5 = detectSpatialClusters(scenario5Reports);
console.log(`✅ Result: ${anomalies5.length} anomalies (expected 0 - failed spatial consistency)`);
console.log("\n" + "─".repeat(70) + "\n");

// ----------------------------------------------------------------------------
// SCENARIO 6: Realistic Multi-Cell Cluster (Should Detect)
// ----------------------------------------------------------------------------
console.log("📍 SCENARIO 6: Realistic Multi-Cell Cluster");
console.log("   Expected: 1 anomaly spanning multiple grid cells");
console.log("   Setup: Large area (~800m) with elevated activity across adjacent cells\n");

const scenario6Reports: Report[] = [
  // Historical baseline: 3-5 reports per month across area
  ...generateClusteredReports(32.085, 34.780, 4, 0.007, "pest", "Downtown", 5),
  ...generateClusteredReports(32.085, 34.780, 3, 0.007, "pest", "Downtown", 4),
  ...generateClusteredReports(32.085, 34.780, 5, 0.007, "pest", "Downtown", 3),
  ...generateClusteredReports(32.085, 34.780, 4, 0.007, "pest", "Downtown", 2),
  ...generateClusteredReports(32.085, 34.780, 3, 0.007, "pest", "Downtown", 1),

  // Current: major spike (30 reports across ~800m = multiple cells)
  ...generateClusteredReports(32.085, 34.780, 30, 0.007, "pest", "Downtown", 0),
];

const anomalies6 = detectSpatialClusters(scenario6Reports);
console.log(`✅ Result: ${anomalies6.length} anomaly detected`);
if (anomalies6.length > 0) {
  console.log(`   Cells Involved: ${anomalies6[0].metrics.cellsInvolved}`);
  console.log(`   Total Reports: ${anomalies6[0].metrics.totalReports}`);
  console.log(`   Radius: ${anomalies6[0].metrics.radiusMeters}m`);
  console.log(`   Percent Change: ${anomalies6[0].metrics.pctChange}%`);
  console.log(`   Avg Z-Score: ${anomalies6[0].metrics.avgZScore}`);
}
console.log("\n" + "─".repeat(70) + "\n");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║                     TEST SUMMARY                               ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log(`
✅ Scenario 1: Dense Cluster          → ${anomalies1.length > 0 ? "PASS" : "FAIL"}
✅ Scenario 2: Sparse Distribution    → ${anomalies2.length === 0 ? "PASS" : "FAIL"}
✅ Scenario 3: Multiple Clusters      → ${anomalies3.length >= 2 ? "PASS" : "FAIL"}
✅ Scenario 4: Noise Filter           → ${anomalies4.length === 0 ? "PASS" : "FAIL"}
✅ Scenario 5: Spatial Consistency    → ${anomalies5.length === 0 ? "PASS" : "FAIL"}
✅ Scenario 6: Multi-Cell Cluster     → ${anomalies6.length > 0 ? "PASS" : "FAIL"}
`);

console.log("\n🎯 Algorithm Features Demonstrated:");
console.log("   • Grid-based spatial partitioning (~500m cells)");
console.log("   • Historical baseline comparison (6 months)");
console.log("   • Dynamic threshold adaptation");
console.log("   • Noise filtering (minimum report requirement)");
console.log("   • Spatial consistency validation (neighbor checking)");
console.log("   • Multi-cell cluster formation (DFS algorithm)");
console.log("   • Severity assignment (Z-score based)");
console.log("   • Map-ready output (centroid + radius)\n");
