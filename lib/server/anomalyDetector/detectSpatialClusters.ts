// detectSpatialClusters.ts
// Spatial anomaly detection: identifies geographic areas with unusually high report density

import { buildMonthlyBins, calcDynamicThreshold, mean, std } from "./utils";
import { buildAnomaly, Anomaly } from "./builders";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CELL_SIZE_DEGREES = 0.003; // ~300m at Israel's latitude (~32°N) - finer granularity
const MONTHS_BACK = 6; // Historical baseline window
const MIN_REPORTS_FOR_ANOMALY = 5; // Minimum reports to trigger anomaly (5 for real clusters)
const SPATIAL_CONSISTENCY_THRESHOLD = 0.15; // Only 15% of neighbors needed (very lenient)

// ============================================================================
// TYPES
// ============================================================================

export interface Report {
  id: string;
  type: string;
  area: string;
  timestamp: number;
  deleted?: boolean;
  lat?: number;
  lng?: number;
}

interface GridCell {
  id: string;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
  centerLat: number;
  centerLng: number;
  reports: Report[];
}

interface CellTimeSeries {
  cellId: string;
  bins: { ts: number; count: number }[];
  currentCount: number;
  historicalMean: number;
  historicalStd: number;
}

interface CellAnomalyScore {
  cellId: string;
  cell: GridCell;
  timeSeries: CellTimeSeries;
  zScore: number;
  pctChange: number;
  threshold: number;
  isAnomaly: boolean;
  severity: "medium" | "high";
}

interface SpatialCluster {
  id: string;
  cells: CellAnomalyScore[];
  centroid: { lat: number; lng: number };
  radius: number;
  totalReports: number;
  avgZScore: number;
  maxZScore: number;
  severity: "medium" | "high";
  area: string;
  category: string;
}

// ============================================================================
// PHASE 1: GRID CELL GENERATION
// ============================================================================

function generateGrid(
  reports: Report[],
  cellSize: number = CELL_SIZE_DEGREES
): Map<string, GridCell> {
  const cells = new Map<string, GridCell>();

  for (const report of reports) {
    if (!report.lat || !report.lng) continue;

    // Snap coordinates to grid
    const latBin = Math.floor(report.lat / cellSize) * cellSize;
    const lngBin = Math.floor(report.lng / cellSize) * cellSize;
    const cellId = `cell_${latBin.toFixed(4)}_${lngBin.toFixed(4)}`;

    if (!cells.has(cellId)) {
      cells.set(cellId, {
        id: cellId,
        latMin: latBin,
        latMax: latBin + cellSize,
        lngMin: lngBin,
        lngMax: lngBin + cellSize,
        centerLat: latBin + cellSize / 2,
        centerLng: lngBin + cellSize / 2,
        reports: [],
      });
    }

    cells.get(cellId)!.reports.push(report);
  }

  return cells;
}

// ============================================================================
// PHASE 2: TEMPORAL BINNING
// ============================================================================

function buildCellTimeSeries(
  cell: GridCell,
  monthsBack: number,
  now: number
): CellTimeSeries {
  const bins = buildMonthlyBins(cell.reports, (r) => r.timestamp, monthsBack, now);

  const currentCount = bins[bins.length - 1]?.count || 0;
  const histCounts = bins.slice(0, -1).map((b) => b.count);
  const historicalMean = mean(histCounts);
  const historicalStd = std(histCounts);

  return {
    cellId: cell.id,
    bins,
    currentCount,
    historicalMean,
    historicalStd,
  };
}

// ============================================================================
// PHASE 3: ANOMALY SCORING
// ============================================================================

function scoreCells(
  cells: Map<string, GridCell>,
  now: number
): CellAnomalyScore[] {
  const scores: CellAnomalyScore[] = [];

  for (const [cellId, cell] of cells) {
    // Skip empty cells
    if (cell.reports.length === 0) continue;

    const timeSeries = buildCellTimeSeries(cell, MONTHS_BACK, now);

    // Calculate dynamic threshold using existing utility
    const { threshold, baselineMean, baselineStd } = calcDynamicThreshold(timeSeries.bins);

    const current = timeSeries.currentCount;
    const μ = baselineMean;
    const σ = baselineStd || 1;

    // Statistical measures
    const zScore = (current - μ) / σ;
    const pctChange = μ > 0 ? ((current - μ) / μ) * 100 : 0;

    // For new areas with no history, use lenient threshold
    let isAnomaly: boolean;
    if (μ === 0) {
      // New area: just need enough reports
      isAnomaly = current >= MIN_REPORTS_FOR_ANOMALY;
    } else {
      // Established area: compare to threshold
      isAnomaly = current >= threshold && current >= MIN_REPORTS_FOR_ANOMALY;
    }

    if (!isAnomaly) continue;

    // Severity based on Z-score and percentage - more lenient
    const severity: "medium" | "high" = zScore >= 2.5 || pctChange >= 80 ? "high" : "medium";

    if (current >= 5) {
      console.log(`   📊 Cell ${cellId}: ${current} reports, μ=${μ.toFixed(1)}, σ=${σ.toFixed(1)}, Z=${zScore.toFixed(2)}, change=${pctChange.toFixed(0)}% → ${severity}`);
    }

    scores.push({
      cellId,
      cell,
      timeSeries,
      zScore,
      pctChange,
      threshold,
      isAnomaly,
      severity,
    });
  }

  console.log(`   📊 Scored ${cells.size} cells, found ${scores.length} anomalous`);
  return scores;
}

// ============================================================================
// PHASE 4: SPATIAL CONSISTENCY VALIDATION
// ============================================================================

function getNeighborCells(
  cellId: string,
  allCells: Map<string, GridCell>,
  cellSize: number = CELL_SIZE_DEGREES
): GridCell[] {
  const parts = cellId.split("_");
  const lat = parseFloat(parts[1]);
  const lng = parseFloat(parts[2]);

  const neighbors: GridCell[] = [];

  // 8-directional neighbors
  const offsets = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  for (const [dLat, dLng] of offsets) {
    const nLat = lat + dLat * cellSize;
    const nLng = lng + dLng * cellSize;
    const nId = `cell_${nLat.toFixed(4)}_${nLng.toFixed(4)}`;

    const neighbor = allCells.get(nId);
    if (neighbor) neighbors.push(neighbor);
  }

  return neighbors;
}

function validateSpatialConsistency(
  anomalyScore: CellAnomalyScore,
  allCells: Map<string, GridCell>
): boolean {
  const neighbors = getNeighborCells(anomalyScore.cellId, allCells);

  // Edge case: no neighbors (unlikely but possible)
  if (neighbors.length === 0) return true;

  // Count neighbors with ANY activity (not necessarily elevated)
  let neighborsWithActivity = 0;

  for (const neighbor of neighbors) {
    // Check if neighbor has any reports at all
    if (neighbor.reports.length > 0) {
      neighborsWithActivity++;
    }
  }

  // For sparse areas: just need some neighbors with activity
  if (neighborsWithActivity > 0) {
    const ratio = neighborsWithActivity / neighbors.length;
    console.log(`   🔗 Cell has ${neighborsWithActivity}/${neighbors.length} neighbors with activity (${(ratio*100).toFixed(0)}%)`);
    return ratio >= SPATIAL_CONSISTENCY_THRESHOLD;
  }

  // Isolated cell - still accept if it has enough reports
  return anomalyScore.timeSeries.currentCount >= MIN_REPORTS_FOR_ANOMALY * 2;
}

// ============================================================================
// PHASE 5: CLUSTER FORMATION (DFS)
// ============================================================================

function formClusters(
  anomalousCells: CellAnomalyScore[],
  allCells: Map<string, GridCell>
): SpatialCluster[] {
  const visited = new Set<string>();
  const clusters: SpatialCluster[] = [];
  let clusterCounter = 0;

  console.log(`      🔄 Starting cluster formation with ${anomalousCells.length} anomalous cells`);

  // Depth-first search to find connected components
  function dfs(cell: CellAnomalyScore, cluster: CellAnomalyScore[]) {
    if (visited.has(cell.cellId)) return;
    visited.add(cell.cellId);
    cluster.push(cell);

    // Find adjacent anomalous cells
    const neighbors = getNeighborCells(cell.cellId, allCells);
    for (const neighbor of neighbors) {
      const neighborScore = anomalousCells.find((s) => s.cellId === neighbor.id);
      if (neighborScore && !visited.has(neighborScore.cellId)) {
        dfs(neighborScore, cluster);
      }
    }
  }

  // Build clusters using DFS - iterate through ALL cells
  for (const cell of anomalousCells) {
    if (visited.has(cell.cellId)) {
      continue; // Already part of another cluster
    }

    console.log(`      🆕 Starting new cluster from cell ${cell.cellId}`);

    const cluster: CellAnomalyScore[] = [];
    dfs(cell, cluster);

    if (cluster.length === 0) {
      console.log(`      ⚠️  Empty cluster, skipping`);
      continue;
    }

    console.log(`      ✅ Cluster has ${cluster.length} cells`);

    // Calculate cluster metrics
    const allReports = cluster.flatMap((c) => c.cell.reports);
    const centroidLat = mean(cluster.map((c) => c.cell.centerLat));
    const centroidLng = mean(cluster.map((c) => c.cell.centerLng));

    // Calculate radius (max distance from centroid to any cell center + cell boundary offset)
    const distances = cluster.map((c) => {
      const dLat = (c.cell.centerLat - centroidLat) * 111000; // degrees to meters (latitude)
      const dLng = (c.cell.centerLng - centroidLng) * 94000; // degrees to meters (longitude at ~32°N)
      return Math.sqrt(dLat * dLat + dLng * dLng);
    });
    // Add half the cell size to account for reports at the edges of cells
    const cellBoundaryOffset = (CELL_SIZE_DEGREES / 2) * 111000; // ~150m for CELL_SIZE_DEGREES = 0.003
    const radius = Math.max(...distances, 150) + cellBoundaryOffset; // Includes cell boundaries

    const zScores = cluster.map((c) => c.zScore);
    const avgZScore = mean(zScores);
    const maxZScore = Math.max(...zScores);

    // Determine cluster severity
    const highSeverityCells = cluster.filter((c) => c.severity === "high").length;
    const severity: "medium" | "high" =
      highSeverityCells / cluster.length >= 0.5 ? "high" : "medium";

    // Determine area (most common area in reports)
    const areaCounts = new Map<string, number>();
    for (const report of allReports) {
      const count = areaCounts.get(report.area) || 0;
      areaCounts.set(report.area, count + 1);
    }
    const area =
      Array.from(areaCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

    // Determine category (most common type in reports)
    const typeCounts = new Map<string, number>();
    for (const report of allReports) {
      const count = typeCounts.get(report.type) || 0;
      typeCounts.set(report.type, count + 1);
    }
    const category =
      Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "mixed";

    // Generate deterministic ID based on location and category
    // Using 5 decimal places (~1 meter precision) to distinguish different clusters
    // but keep same ID if cluster appears in same location on different runs
    const safeArea = area.replace(/\s+/g, "_");
    const latStr = centroidLat.toFixed(5).replace(".", "_");
    const lngStr = centroidLng.toFixed(5).replace(".", "_");
    const uniqueId = `anom_${category}_${safeArea}_geo_${latStr}_${lngStr}`;
    clusterCounter++;
    
    console.log(`      📍 Cluster ID: ${uniqueId}, centroid: (${centroidLat.toFixed(5)}, ${centroidLng.toFixed(5)}), reports: ${allReports.length}`);

    clusters.push({
      id: uniqueId,
      cells: cluster,
      centroid: { lat: centroidLat, lng: centroidLng },
      radius: Math.round(radius),
      totalReports: allReports.length,
      avgZScore: parseFloat(avgZScore.toFixed(2)),
      maxZScore: parseFloat(maxZScore.toFixed(2)),
      severity,
      area,
      category,
    });
  }

  console.log(`   🔗 Formed ${clusters.length} spatial clusters (visited ${visited.size} cells)`);
  return clusters;
}

// ============================================================================
// PHASE 6: ANOMALY OBJECT CONSTRUCTION
// ============================================================================

function buildSpatialAnomaly(cluster: SpatialCluster): Anomaly {
  const relatedReportIds = cluster.cells.flatMap((c) => c.cell.reports).map((r) => r.id);

  // Calculate aggregate metrics from all cells in the cluster
  const baselineMeans = cluster.cells.map((c) => c.timeSeries.historicalMean);
  const clusterBaselineMean = mean(baselineMeans);
  
  // Calculate aggregate standard deviation (average of cell stds)
  const baselineStds = cluster.cells.map((c) => c.timeSeries.historicalStd);
  const clusterBaselineStd = mean(baselineStds);
  
  // Calculate aggregate threshold (average of cell thresholds)
  const thresholds = cluster.cells.map((c) => c.threshold);
  const clusterThreshold = mean(thresholds);

  const currentCounts = cluster.cells.map((c) => c.timeSeries.currentCount);
  const clusterCurrentCount = currentCounts.reduce((a, b) => a + b, 0);

  const pctChange =
    clusterBaselineMean > 0
      ? ((clusterCurrentCount - clusterBaselineMean * cluster.cells.length) /
          (clusterBaselineMean * cluster.cells.length)) *
        100
      : 0;

  const anomaly = buildAnomaly({
    category: cluster.category,
    type: "geo_cluster",
    area: cluster.area,
    title: `ריכוז גיאוגרפי של דיווחי ${cluster.category} באזור ${cluster.area}`,
    description: `זוהה ריכוז חריג של ${cluster.totalReports} דיווחים ברדיוס ${cluster.radius}מ' סביב נקודה מרכזית. הפעילות עלתה ב-${pctChange.toFixed(0)}% מול ההיסטוריה (Z-max=${cluster.maxZScore}).`,
    metrics: {
      // Standard metrics expected by UI
      currentReports: cluster.totalReports,
      baselineMean: parseFloat(clusterBaselineMean.toFixed(2)),
      baselineStd: parseFloat(clusterBaselineStd.toFixed(2)),
      threshold: parseFloat(clusterThreshold.toFixed(2)),
      pctChange: Math.round(pctChange),
      zScore: parseFloat(cluster.avgZScore.toFixed(2)),
      
      // Geo-cluster specific metrics
      totalReports: cluster.totalReports,
      cellsInvolved: cluster.cells.length,
      radiusMeters: Math.round(cluster.radius),
      centroidLat: cluster.centroid.lat,
      centroidLng: cluster.centroid.lng,
      avgZScore: parseFloat(cluster.avgZScore.toFixed(2)),
      maxZScore: parseFloat(cluster.maxZScore.toFixed(2)),
    },
    relatedReports: relatedReportIds,
    center: cluster.centroid,
    severity: cluster.severity,
  });

  // ✅ Override the ID with the unique cluster ID to prevent collisions
  anomaly.id = cluster.id;

  return anomaly;
}

// ============================================================================
// MAIN DETECTOR FUNCTION
// ============================================================================

export function detectSpatialClusters(reports: Report[], now = Date.now()): Anomaly[] {
  console.log("\n=== 🌍 detectSpatialClusters START ===");
  console.log("📦 Total reports received:", reports.length);

  // 1. Filter active reports with valid coordinates
  const validReports = reports.filter((r) => !r.deleted && r.lat && r.lng);
  console.log("📍 Valid geo-reports:", validReports.length);

  if (validReports.length < MIN_REPORTS_FOR_ANOMALY) {
    console.log("⚠️  Insufficient reports for spatial analysis");
    return [];
  }

  // 2. Group by category - detect clusters separately for each type
  const byType = new Map<string, Report[]>();
  validReports.forEach(r => {
    if (!byType.has(r.type)) {
      byType.set(r.type, []);
    }
    byType.get(r.type)!.push(r);
  });
  console.log("📊 Reports by type:", Array.from(byType.entries()).map(([type, reps]) => `${type}:${reps.length}`).join(", "));

  const allAnomalies: Anomaly[] = [];

  // 3. Process each category separately
  for (const [category, categoryReports] of byType.entries()) {
    console.log(`\n🔍 Processing category: ${category} (${categoryReports.length} reports)`);

    if (categoryReports.length < MIN_REPORTS_FOR_ANOMALY) {
      console.log(`   ⚠️  Skipping ${category} - insufficient reports`);
      continue;
    }

    // Generate grid cells for this category only
    const cells = generateGrid(categoryReports, CELL_SIZE_DEGREES);
    console.log(`   🔲 Grid cells for ${category}:`, cells.size);
    
    // Show all non-empty cells for this category
    const nonEmptyCells = Array.from(cells.values())
      .filter(cell => cell.reports.length > 0)
      .sort((a, b) => b.reports.length - a.reports.length);
    
    console.log(`   📊 Non-empty cells: ${nonEmptyCells.length}`);
    nonEmptyCells.forEach((cell, idx) => {
      if (idx < 10) { // Show top 10
        console.log(`      Cell ${idx + 1}: ${cell.id} with ${cell.reports.length} reports at (${cell.centerLat.toFixed(5)}, ${cell.centerLng.toFixed(5)})`);
      }
    });

    // Score each cell for anomalies
    const scores = scoreCells(cells, now);
    console.log(`   ⚠️  Anomalous cells found:`, scores.length);
    scores.forEach((score, idx) => {
      console.log(`      Anomaly ${idx + 1}: Cell ${score.cellId} - ${score.timeSeries.currentCount} reports (Z=${score.zScore.toFixed(2)})`);
    });

    if (scores.length === 0) {
      console.log(`   ⚠️  No anomalous cells for ${category}`);
      continue;
    }

    // Validate spatial consistency
    const validatedScores = scores.filter((score) => {
      const isValid = validateSpatialConsistency(score, cells);
      if (!isValid) {
        console.log(`      ❌ Cell ${score.cellId} failed spatial consistency`);
      }
      return isValid;
    });
    console.log(`   ✅ Spatially consistent cells:`, validatedScores.length);

    if (validatedScores.length === 0) {
      console.log(`   ⚠️  No spatially consistent anomalies for ${category}`);
      continue;
    }

    // Form clusters from adjacent cells
    const clusters = formClusters(validatedScores, cells);
    console.log(`   🔗 Clusters formed for ${category}:`, clusters.length);
    
    // Log each cluster details
    clusters.forEach((cluster, idx) => {
      console.log(`      Cluster ${idx + 1}: ${cluster.cells.length} cells, ${cluster.totalReports} reports at (${cluster.centroid.lat.toFixed(5)}, ${cluster.centroid.lng.toFixed(5)})`);
    });

    // Convert to Anomaly objects and add to results
    const categoryAnomalies = clusters.map((cluster) => buildSpatialAnomaly(cluster));
    console.log(`   ✨ Created ${categoryAnomalies.length} anomaly objects for ${category}`);
    categoryAnomalies.forEach((anomaly, idx) => {
      console.log(`      Anomaly ${idx + 1}: ID=${anomaly.id}`);
    });
    
    allAnomalies.push(...categoryAnomalies);
    console.log(`   📦 Total anomalies so far: ${allAnomalies.length}`);
  }

  // 4. Sort all anomalies by severity and Z-score
  allAnomalies.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "high" ? -1 : 1;
    }
    return (b.metrics.maxZScore as number) - (a.metrics.maxZScore as number);
  });

  console.log("\n🚨 Final spatial anomalies:", allAnomalies.length);
  allAnomalies.forEach(a => {
    console.log(`   ✅ ${a.category} in ${a.area}: ${a.metrics.totalReports} reports, radius=${a.metrics.radiusMeters}m`);
  });
  console.log("=== 🌍 detectSpatialClusters END ===\n");

  return allAnomalies;
}
