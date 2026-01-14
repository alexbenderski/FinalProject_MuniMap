// seed-realistic-data-v2.ts
// ===================================
// V2: Shape data for REAL anomaly detection
// ===================================
// Instead of writing anomaly records, this version creates report patterns
// that the anomaly detection system will naturally discover:
//
// 1. SPIKE PATTERN: 2 categories get 80+ extra reports in current month
// 2. SLOW RESOLUTION: 2 categories have 15+ day resolution times in current month
// 3. GEO CLUSTER: 2 categories have 20+ reports in same 300m radius

import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const SEED = 12345;
const TARGET_CITIES = ["חיפה", "נשר"];

// Base reports (will be spread across 12 months)
const BASE_REPORTS_PER_CITY = 50;
const ARCHIVE_REPORTS_PER_CITY = 50;

// Anomaly patterns (added on top of base reports)
const SPIKE_EXTRA_REPORTS = 40; // Extra reports in current month for spike categories
const CLUSTER_REPORTS = 15; // Reports in same location for cluster
const SLOW_RESOLUTION_DAYS_MIN = 15; // Min days for slow resolution
const SLOW_RESOLUTION_DAYS_MAX = 25; // Max days

const CATEGORIES = ["garbage", "lighting", "hazard", "tree", "animal", "maintenance", "pest"] as const;
type Category = (typeof CATEGORIES)[number];
type Status = "open" | "pending" | "in progress" | "resolved";

const SLA_DAYS: Record<Category, number> = {
garbage: 4,
lighting: 10,
tree: 14,
hazard: 2,
animal: 3,
maintenance: 21,
pest: 7,
};

// ============================================================================
// TYPES
// ============================================================================

interface Coordinate {
  lat: number;
  lng: number;
}

interface Report {
  city: string;
  area: string;
  type: Category;
  description: string;
  street: string;
  address: string;
  status: Status;
  timestamp: number;
  lat: number;
  lng: number;
  imageUrl: string;
  submittedBy: string;
  email: string;
  phone: string;
  deleted: boolean;
  statusHistory?: Array<{ status: Status; updatedAt: number; updatedBy: string; authority?: string; email?: string }>;
  resolvedAt?: number;
  updatedBy?: string;
  updatedAt?: number;
}

// ============================================================================
// SEEDED RANDOM (Deterministic)
// ============================================================================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  nextFloat(min: number = 0, max: number = 1): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

// ============================================================================
// POINT-IN-POLYGON & GEOMETRY
// ============================================================================

function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function getPolygonBounds(polygon: Coordinate[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLat = Infinity,
    maxLat = -Infinity;
  let minLng = Infinity,
    maxLng = -Infinity;

  for (const p of polygon) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  return { minLat, maxLat, minLng, maxLng };
}

function generatePointInPolygon(
  polygon: Coordinate[],
  rng: SeededRandom,
  maxAttempts: number = 100
): Coordinate | null {
  const bounds = getPolygonBounds(polygon);

  for (let i = 0; i < maxAttempts; i++) {
    const point: Coordinate = {
      lat: rng.nextFloat(bounds.minLat, bounds.maxLat),
      lng: rng.nextFloat(bounds.minLng, bounds.maxLng),
    };

    if (isPointInPolygon(point, polygon)) {
      return point;
    }
  }

  return null;
}

// ============================================================================
// DESCRIPTION TEMPLATES (Hebrew)
// ============================================================================

const DESCRIPTIONS: Record<Category, readonly string[]> = {
  garbage: [
    "פח מלא שמזיל",
    "אשפה מפוזרת ברחוב",
    "צריך פינוי דחוף",
    "ריח רע מהפחים",
    "אשפה ליד המעבר חצייה",
  ],
  lighting: [
    "פנס רחוב לא עובד",
    "תאורה כבויה כבר שבוע",
    "מסוכן בלילה",
    "צריך להחליף נורה",
    "אור מהבהב",
  ],
  hazard: [
    "בור בכביש",
    "שלט תמרור נפל",
    "גדר שבורה",
    "סכנה לעוברי דרך",
    "מדרכה שבורה",
  ],
  tree: [
    "עץ מסוכן - ענפים נופלים",
    "צריך גיזום דחוף",
    "העץ חוסם את הכביש",
    "שורשים מרימים את המדרכה",
    "עץ יבש",
  ],
  animal: [
    "כלב הולך רופף",
    "חתולים בשכונה",
    "עופות חורצים",
    "בעל חיים תקוע",
    "כביש לא בטוח לבעלי חיים",
  ],
  maintenance: [
    "פרצות בכביש",
    "ספסל שבור",
    "מדרכה שקועה",
    "צריך תיקון דחוף",
    "תשתית פגומה",
  ],
  pest: [
    "פשפשים בשכונה",
    "נמלים בכל מקום",
    "תיקייה של עכברים",
    "זיהום חרקים",
    "צריך הדברה דחוף",
  ],
};

// ============================================================================
// STREET NAMES (by city)
// ============================================================================

// ============================================================================
// RESIDENT DATA
// ============================================================================

const FIRST_NAMES = ["אבי", "דני", "יוסי", "משה", "רונה", "שרה", "דוד", "מרים", "יעקב", "רחל"] as const;
const LAST_NAMES = ["כהן", "לוי", "מזרחי", "אבו", "ישראלי", "בן דוד", "שלום", "ברק"] as const;

function generatePhone(rng: SeededRandom): string {
  const prefix = rng.pick(["050", "052", "053", "054", "055", "058"]);
  const number = rng.nextInt(1000000, 9999999);
  return `${prefix}-${number}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "walla.co.il", "yahoo.com", "hotmail.com"];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  return `${firstName}.${lastName}@${randomDomain}`;
}

// ============================================================================
// STREET NAMES (by city)
// ============================================================================

const STREET_NAMES: Record<string, readonly string[]> = {
  חיפה: [
    "הרצל",
    "נורדאו",
    "בן גוריון",
    "אלנבי",
    "הנביאים",
    "הנשיא",
    "דרך יפו",
    "שדרות הציונות",
  ],
  נשר: [
    "הרצל",
    "ויצמן",
    "רוטשילד",
    "הגיבורים",
    "העצמאות",
    "התקווה",
    "הנוריות",
    "הגפן",
  ],


};

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateStatusHistory(
  status: Status,
  timestamp: number,
  resolvedAt: number | undefined,
  rng: SeededRandom
): Array<{ status: Status; updatedAt: number; updatedBy: string; authority?: string; email?: string }> {
  const history: Array<{ status: Status; updatedAt: number; updatedBy: string; authority?: string; email?: string }> = [];

  // Start with open
  history.push({
    status: "open",
    updatedAt: timestamp,
    updatedBy: "System",
    authority: "System",
  });

  if (status === "open") return history;

  // Add pending
  if (rng.next() > 0.3) {
    history.push({
      status: "pending",
      updatedAt: timestamp + rng.nextInt(1, 3) * 24 * 60 * 60 * 1000,
      updatedBy: "Admin",
      authority: "Municipal Admin",
    });
  }

  if (status === "pending") return history;

  // Add in progress
  if (status === "in progress" || status === "resolved") {
    history.push({
      status: "in progress",
      updatedAt: timestamp + rng.nextInt(2, 5) * 24 * 60 * 60 * 1000,
      updatedBy: "Worker",
      authority: "Field Worker",
    });
  }

  if (status === "in progress") return history;

  // Add resolved
  if (status === "resolved" && resolvedAt) {
    history.push({
      status: "resolved",
      updatedAt: resolvedAt,
      updatedBy: "Worker",
      authority: "Field Worker",
    });
  }

  return history;
}

function generateReport(
  city: string,
  polygon: Coordinate[],
  category: Category,
  status: Status,
  ageInDays: number,
  rng: SeededRandom,
  forcedCoordinate?: Coordinate // For clusters
): Report | null {
  const point = forcedCoordinate || generatePointInPolygon(polygon, rng);
  if (!point) return null;

  const now = Date.now();
  const timestamp = now - ageInDays * 24 * 60 * 60 * 1000;

  // Calculate resolvedAt
  let resolvedAt: number | undefined;
  if (status === "resolved") {
    const daysToResolve = rng.nextInt(1, SLA_DAYS[category] * 2);
    resolvedAt = timestamp + daysToResolve * 24 * 60 * 60 * 1000;
  }

  const streetList = STREET_NAMES[city] || STREET_NAMES["חיפה"];
  const firstName = rng.pick(FIRST_NAMES);
  const lastName = rng.pick(LAST_NAMES);
  const street = rng.pick(streetList);
  const streetNumber = rng.nextInt(1, 200);

  const report: Report = {
    city,
    area: city,
    type: category,
    description: rng.pick(DESCRIPTIONS[category]),
    street,
    address: `${street} ${streetNumber}, ${city}`,
    status,
    timestamp,
    lat: point.lat,
    lng: point.lng,
    imageUrl: `https://source.unsplash.com/random/800x600?${category}`,
    submittedBy: `${firstName} ${lastName}`,
    email: generateEmail(firstName, lastName),
    phone: generatePhone(rng),
    deleted: false,
    statusHistory: generateStatusHistory(status, timestamp, resolvedAt, rng),
  };

  // Only add resolvedAt if it exists (avoid undefined in Firebase)
  if (resolvedAt) {
    report.resolvedAt = resolvedAt;
  }

  // Add updatedBy and updatedAt based on latest status
  if (report.statusHistory && report.statusHistory.length > 0) {
    const latestStatus = report.statusHistory[report.statusHistory.length - 1];
    report.updatedBy = latestStatus.updatedBy;
    report.updatedAt = latestStatus.updatedAt;
  }

  return report;
}

// ============================================================================
// ANOMALY PATTERNS (Data Shaping, not Record Writing)
// ============================================================================

interface AnomalyPatterns {
  spikeCategories: [Category, Category]; // 2 categories that will spike
  slowResolutionCategories: [Category, Category]; // 2 categories with slow resolution
  clusterCategories: [Category, Category]; // 2 categories with geo clusters
  clusterCenters: [Coordinate, Coordinate]; // Centers for clusters
}

function planAnomalyPatterns(
  city: string,
  polygon: Coordinate[],
  rng: SeededRandom
): AnomalyPatterns {
  const shuffled = rng.shuffle(CATEGORIES);

  return {
    spikeCategories: [shuffled[0], shuffled[1]],
    slowResolutionCategories: [shuffled[2], shuffled[3]],
    clusterCategories: [shuffled[0], shuffled[2]], // Reuse some categories
    clusterCenters: [
      generatePointInPolygon(polygon, rng)!,
      generatePointInPolygon(polygon, rng)!,
    ],
  };
}

// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================

async function loadCityBoundaries(): Promise<Map<string, Coordinate[]>> {
  const boundariesPath = path.join(
    __dirname,
    "../../public/data/cities_municipal_boundaries.json"
  );

  console.log(`📂 Loading city boundaries from: ${boundariesPath}`);

  if (!fs.existsSync(boundariesPath)) {
    throw new Error("❌ cities_municipal_boundaries.json not found");
  }

  const data = JSON.parse(fs.readFileSync(boundariesPath, "utf-8"));
  const map = new Map<string, Coordinate[]>();

  // The JSON structure is: [{ city: "name", coordinates: [{lat, lng}, ...] }, ...]
  for (const cityData of data) {
    const cityName = cityData.city;
    const coords = cityData.coordinates;
    map.set(cityName, coords);
  }

  return map;
}

async function initializeFirebase(): Promise<admin.database.Database> {
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

  return admin.database();
}

// ============================================================================
// CITY SEEDING
// ============================================================================

async function seedCity(
  db: admin.database.Database,
  city: string,
  polygon: Coordinate[],
  random: SeededRandom
): Promise<void> {
  try {
    console.log(`\n🏙️ Seeding city: ${city}`);
    console.log(`   📍 Polygon has ${polygon.length} vertices`);

    // Plan anomaly patterns
    const patterns = planAnomalyPatterns(city, polygon, random);
    console.log(`   🎯 Spike categories: ${patterns.spikeCategories.join(", ")}`);
    console.log(`   🐢 Slow resolution categories: ${patterns.slowResolutionCategories.join(", ")}`);
    console.log(`   📍 Cluster categories: ${patterns.clusterCategories.join(", ")}`);

    let writtenReports = 0;
    let writtenArchive = 0;

  // ==========================================
  // BASE REPORTS (spread across 12 months)
  // ==========================================
  console.log(`   📝 Generating ${BASE_REPORTS_PER_CITY} base reports...`);

  for (let i = 0; i < BASE_REPORTS_PER_CITY; i++) {
    const category = random.pick(CATEGORIES);

    // Status distribution
    const statusRand = random.next();
    let status: Status;
    if (statusRand < 0.15) status = "open";
    else if (statusRand < 0.30) status = "pending";
    else if (statusRand < 0.50) status = "in progress";
    else status = "resolved";

    // Age: 0-365 days (spread across 12 months)
    const ageInDays = random.nextInt(0, 365);

    const report = generateReport(city, polygon, category, status, ageInDays, random);
    if (!report) continue;

    // New path structure: /Reports/ActiveReports/{city}/{category}/{id}
    const reportRef = db.ref(`Reports/ActiveReports/${city}/${category}`).push();
    await reportRef.set(report);
    writtenReports++;
  }

  // ==========================================
  // SPIKE PATTERN: Extra reports in current month
  // ==========================================
  console.log(`   🚀 Adding SPIKE pattern: ${SPIKE_EXTRA_REPORTS} extra reports per category...`);

  for (const category of patterns.spikeCategories) {
    for (let i = 0; i < SPIKE_EXTRA_REPORTS; i++) {
      // All in current month (0-30 days ago)
      const ageInDays = random.nextInt(0, 30);

      const report = generateReport(city, polygon, category, "open", ageInDays, random);
      if (!report) continue;

      // New path structure: /Reports/ActiveReports/{city}/{category}/{id}
      const reportRef = db.ref(`Reports/ActiveReports/${city}/${category}`).push();
      await reportRef.set(report);
      writtenReports++;
    }
  }

  // ==========================================
  // SLOW RESOLUTION PATTERN
  // ==========================================
  console.log(`   🐢 Adding SLOW RESOLUTION pattern: 15+ day resolution times...`);

  for (const category of patterns.slowResolutionCategories) {
    for (let i = 0; i < 20; i++) {
      // Recent reports (last 30 days)
      const ageInDays = random.nextInt(0, 30);
      const report = generateReport(city, polygon, category, "resolved", ageInDays, random);
      if (!report) continue;

      // Override resolvedAt to be VERY slow (15-25 days)
      const slowDays = random.nextInt(
        SLOW_RESOLUTION_DAYS_MIN,
        SLOW_RESOLUTION_DAYS_MAX
      );
      report.resolvedAt = report.timestamp + slowDays * 24 * 60 * 60 * 1000;

      // Update status history
      report.statusHistory = generateStatusHistory(
        "resolved",
        report.timestamp,
        report.resolvedAt,
        random
      );

      // New path structure: /Reports/ActiveReports/{city}/{category}/{id}
      const reportRef = db.ref(`Reports/ActiveReports/${city}/${category}`).push();
      await reportRef.set(report);
      writtenReports++;
    }
  }

  // ==========================================
  // GEO CLUSTER PATTERN
  // ==========================================
  console.log(`   📍 Adding GEO CLUSTER pattern: ${CLUSTER_REPORTS} reports per cluster...`);

  for (let clusterIdx = 0; clusterIdx < 2; clusterIdx++) {
    const category = patterns.clusterCategories[clusterIdx];
    const center = patterns.clusterCenters[clusterIdx];

    for (let i = 0; i < CLUSTER_REPORTS; i++) {
      // Scatter around center (within ~100m radius)
      const offsetLat = random.nextFloat(-0.001, 0.001); // ~110m
      const offsetLng = random.nextFloat(-0.001, 0.001); // ~80m

      const clusterPoint: Coordinate = {
        lat: center.lat + offsetLat,
        lng: center.lng + offsetLng,
      };

      // Recent reports (last 30 days)
      const ageInDays = random.nextInt(0, 30);

      const report = generateReport(
        city,
        polygon,
        category,
        random.pick(["open", "pending", "in progress"]),
        ageInDays,
        random,
        clusterPoint
      );
      if (!report) continue;

      // New path structure: /Reports/ActiveReports/{city}/{category}/{id}
      const reportRef = db.ref(`Reports/ActiveReports/${city}/${category}`).push();
      await reportRef.set(report);
      writtenReports++;
    }
  }

  console.log(`   ✅ Written ${writtenReports} active reports (including anomaly patterns)`);

  // ==========================================
  // ARCHIVE REPORTS (>1 year old)
  // ==========================================
  console.log(`   📦 Generating ${ARCHIVE_REPORTS_PER_CITY} archive reports...`);

  const archiveYears = [  2024];

  for (let i = 0; i < ARCHIVE_REPORTS_PER_CITY; i++) {
    const category = random.pick(CATEGORIES);
    const year = random.pick(archiveYears);

    // Age: 400-800 days
    const ageInDays = random.nextInt(400, 800);

    const report = generateReport(city, polygon, category, "resolved", ageInDays, random);
    if (!report) continue;

    // Calculate month from timestamp
    const reportDate = new Date(report.timestamp);
    const month = String(reportDate.getMonth() + 1).padStart(2, '0');

    const archivedReport = {
      ...report,
      archivedYear: year,
      archivedCity: city,
    };

    // New archive path: /ArchivedReports/{year}/{month}/{city}/{category}/{id}
    const archiveRef = db.ref(`ArchivedReports/${year}/${month}/${city}/${category}`).push();
    await archiveRef.set(archivedReport);
    writtenArchive++;
  }

  console.log(`   ✅ Written ${writtenArchive} archive reports`);
    console.log(`   🎉 City ${city} seeding complete!`);
  } catch (error) {
    console.error(`\n❌ Error seeding ${city}:`, error);
    throw error;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║     MuniMap Realistic Data Seeder V2               ║");
  console.log("║     ✨ Shapes data for REAL anomaly detection      ║");
  console.log("║     🚨 ADMIN-ONLY - DO NOT RUN IN PRODUCTION       ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  try {
    const boundaries = await loadCityBoundaries();
    const db = await initializeFirebase();
    const random = new SeededRandom(SEED);

    console.log(`🌱 Using seed: ${SEED}`);
    console.log(`🎯 Target cities: ${TARGET_CITIES.join(", ")}\n`);

    for (const city of TARGET_CITIES) {
      if (!boundaries.has(city)) {
        throw new Error(`❌ City "${city}" not found in boundaries`);
      }
    }

    for (const city of TARGET_CITIES) {
      const polygon = boundaries.get(city)!;
      await seedCity(db, city, polygon, random);
    }

    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║     ✅ SEEDING COMPLETE                             ║");
    console.log("╚════════════════════════════════════════════════════╝");
    console.log(`\nData structure per city:`);
    console.log(`  - Base reports: ${BASE_REPORTS_PER_CITY} (spread across 12 months)`);
    console.log(`  - Spike pattern: ${SPIKE_EXTRA_REPORTS * 2} extra reports (2 categories)`);
    console.log(`  - Slow resolution: ~40 reports with 15-25 day resolution (2 categories)`);
    console.log(`  - Geo clusters: ${CLUSTER_REPORTS * 2} reports in tight clusters (2 clusters)`);
    console.log(`  - Archive: ${ARCHIVE_REPORTS_PER_CITY} old reports`);
    console.log(`\n🔍 Run anomaly detection server to discover anomalies!`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

main();
