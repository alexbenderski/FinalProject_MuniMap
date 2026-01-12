/**
 * Realistic Data Seeder for MuniMap
 * 
 * 🚨 ADMIN-ONLY SCRIPT - FOR INITIAL DATA SEEDING
 * 
 * This script generates realistic municipal report data for 3 cities:
 * - חיפה (Haifa)
 * - נשר (Nesher)
 * - חוף הכרמל (Hof HaCarmel)
 * 
 * Each city gets:
 * - 12 months of reports with mixed statuses
 * - Archive data (>1 year old, all resolved)
 * - 6 anomalies (2 spike, 2 slow_response, 2 geo_cluster)
 * 
 * Usage: npx ts-node scripts/seed-data/seed-realistic-data.ts
 */

import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// CONFIGURATION
// ============================================

const SEED = 12345; // For reproducible randomness
const REPORTS_PER_CITY = 150; // Active reports per city
const ARCHIVE_REPORTS_PER_CITY = 100; // Archived reports per city

const TARGET_CITIES = [
  "חיפה",
  "נשר", 
  "חוף הכרמל"
];

const CATEGORIES = ["garbage", "lighting", "tree", "hazard"] as const;
type Category = typeof CATEGORIES[number];

const STATUSES = ["open", "pending", "in progress", "resolved"] as const;
type Status = typeof STATUSES[number];

// SLA days per category
const SLA_DAYS: Record<Category, number> = {
  garbage: 5,
  lighting: 7,
  tree: 8,
  hazard: 7,
};

// ============================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    // LCG parameters (same as glibc)
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(array: readonly T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ============================================
// POINT-IN-POLYGON VALIDATION
// ============================================

interface Coordinate {
  lat: number;
  lng: number;
}

function isPointInPolygon(lat: number, lng: number, polygon: Coordinate[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

function getPolygonBounds(polygon: Coordinate[]): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  
  for (const p of polygon) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  
  return { minLat, maxLat, minLng, maxLng };
}

function generatePointInPolygon(
  polygon: Coordinate[], 
  random: SeededRandom, 
  maxAttempts: number = 100
): Coordinate | null {
  const bounds = getPolygonBounds(polygon);
  
  for (let i = 0; i < maxAttempts; i++) {
    const lat = random.nextFloat(bounds.minLat, bounds.maxLat);
    const lng = random.nextFloat(bounds.minLng, bounds.maxLng);
    
    if (isPointInPolygon(lat, lng, polygon)) {
      return { lat, lng };
    }
  }
  
  // Fallback: return center of bounds
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
}

// ============================================
// DESCRIPTION TEMPLATES
// ============================================

const DESCRIPTION_TEMPLATES: Record<Category, string[]> = {
  garbage: [
    "פח אשפה עולה על גדותיו",
    "אשפה מפוזרת ברחוב",
    "פח שבור וזקוק להחלפה",
    "ריח רע מפח האשפה",
    "פסולת בניין לא פונתה",
    "שקיות אשפה נקרעו ע״י חתולים",
    "פח מלא ללא פינוי כבר שבוע",
    "אשפה נערמת ליד התחנה",
    "פח הוזז ממקומו",
    "פסולת אלקטרונית מושלכת ברחוב",
  ],
  lighting: [
    "פנס רחוב לא דולק",
    "תאורה מהבהבת ברחוב",
    "עמוד תאורה נפל",
    "פנס שבור בחניון",
    "אזור חשוך ללא תאורה",
    "תאורה חלשה בכביש הראשי",
    "פנס דולק גם ביום",
    "תאורה לא עובדת במעבר חציה",
    "כבל תאורה חשוף",
    "נורה שרופה בפנס הציבורי",
  ],
  tree: [
    "עץ נפל על המדרכה",
    "ענף גדול נשבר ומסכן עוברי אורח",
    "עץ מת וזקוק להסרה",
    "שורשי עץ הרסו את המדרכה",
    "עץ גדל לתוך כבלי חשמל",
    "עץ חוסם שלט תנועה",
    "נטיעה חדשה מתה",
    "עץ נגוע במזיקים",
    "ענפים נמוכים חוסמים מעבר",
    "עץ נוטה ועלול ליפול",
  ],
  hazard: [
    "בור במדרכה",
    "מכסה ביוב פתוח",
    "מעקה שבור בגשר",
    "כביש שקוע ומסוכן",
    "שלט תנועה נפל",
    "חוטי חשמל חשופים",
    "מדרכה שבורה",
    "ריצוף מסוכן בכיכר",
    "מעקה בטיחות חסר",
    "מהמורות בכביש",
  ],
};

const STREET_NAMES: Record<string, string[]> = {
  "חיפה": [
    "הנמל", "הרצל", "בן גוריון", "אלנבי", "יפו", "חורב", "מוריה",
    "הגפן", "העמק", "הכרמל", "סטלה מאריס", "שדרות הציונות"
  ],
  "נשר": [
    "הראשונים", "הנשיא", "ירושלים", "הגליל", "העצמאות", "השלום",
    "יצחק רבין", "הזית", "התאנה", "הרימון"
  ],
  "חוף הכרמל": [
    "החוף", "הים", "הדייגים", "המזח", "הגלים", "השקמה",
    "עין הוד", "נחשולים", "כפר הים", "הטיילת"
  ],
};

// ============================================
// REPORT GENERATION
// ============================================

interface StatusHistoryEntry {
  status: Status;
  updatedAt: number;
  updatedBy: string;
}

interface GeneratedReport {
  area: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  status: Status;
  timestamp: number;
  openedAt: number;
  pendingAt?: number;
  inProgressAt?: number;
  resolvedAt?: number;
  type: Category;
  media: boolean;
  submittedBy: string;
  email: string;
  phone: string;
  deleted: boolean;
  statusHistory: StatusHistoryEntry[];
  updatedAt: number;
  updatedBy: string;
}

function generateStatusHistory(
  finalStatus: Status,
  openedAt: number,
  resolvedAt: number | null,
  random: SeededRandom
): { history: StatusHistoryEntry[]; timestamps: Record<string, number> } {
  const history: StatusHistoryEntry[] = [];
  const timestamps: Record<string, number> = { openedAt };
  
  const statusIndex = STATUSES.indexOf(finalStatus);
  const statusesToAdd = STATUSES.slice(0, statusIndex + 1);
  
  // Calculate time span
  const endTime = resolvedAt || Date.now();
  const timeSpan = endTime - openedAt;
  const intervalPerStatus = timeSpan / statusesToAdd.length;
  
  let currentTime = openedAt;
  
  for (const status of statusesToAdd) {
    const jitter = random.nextInt(0, Math.floor(intervalPerStatus * 0.3));
    const statusTime = status === "open" ? openedAt : currentTime + jitter;
    
    history.push({
      status,
      updatedAt: statusTime,
      updatedBy: status === "open" ? "citizen" : "SeederBot",
    });
    
    timestamps[`${status}At`] = statusTime;
    currentTime = statusTime + intervalPerStatus;
  }
  
  return { history, timestamps };
}

function generateReport(
  city: string,
  polygon: Coordinate[],
  category: Category,
  status: Status,
  ageInDays: number,
  random: SeededRandom
): GeneratedReport | null {
  const location = generatePointInPolygon(polygon, random);
  if (!location) return null;
  
  // Validate location is inside polygon
  if (!isPointInPolygon(location.lat, location.lng, polygon)) {
    console.warn(`⚠️ Generated point outside polygon for ${city}`);
    return null;
  }
  
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const openedAt = now - (ageInDays * msPerDay);
  
  // For resolved status, calculate resolution time
  const resolvedAt = status === "resolved" 
    ? openedAt + random.nextInt(1, 14) * msPerDay 
    : null;
  
  const { history, timestamps } = generateStatusHistory(status, openedAt, resolvedAt, random);
  
  const streets = STREET_NAMES[city] || ["רחוב ראשי"];
  const streetName = random.pick(streets);
  const streetNum = random.nextInt(1, 150);
  
  return {
    area: city,
    description: random.pick(DESCRIPTION_TEMPLATES[category]),
    lat: location.lat,
    lng: location.lng,
    address: `${streetName} ${streetNum}, ${city}`,
    status,
    timestamp: openedAt,
    openedAt,
    ...(timestamps.pendingAt && { pendingAt: timestamps.pendingAt }),
    ...(timestamps["in progressAt"] && { inProgressAt: timestamps["in progressAt"] }),
    ...(resolvedAt && { resolvedAt }),
    type: category,
    media: random.next() < 0.25,
    submittedBy: "SeederBot",
    email: `test${random.nextInt(1, 999)}@example.com`,
    phone: `05${random.nextInt(0, 9)}${random.nextInt(1000000, 9999999)}`,
    deleted: false,
    statusHistory: history,
    updatedAt: history[history.length - 1].updatedAt,
    updatedBy: "SeederBot",
  };
}

// ============================================
// ANOMALY GENERATION
// ============================================

interface Anomaly {
  id: string;
  category: string;
  type: string;
  area: string;
  title: string;
  description: string;
  metrics: Record<string, number | string>;
  relatedReports: string[];
  severity: "low" | "medium" | "high";
  status: "open" | "closed";
  firstDetected: number;
  lastUpdated: number;
  center: Coordinate | null;
}

function generateAnomalies(
  city: string,
  polygon: Coordinate[],
  reportIds: string[],
  random: SeededRandom
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = Date.now();
  
  // Get city center
  const bounds = getPolygonBounds(polygon);
  const center: Coordinate = {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
  
  // 2 Spike anomalies
  for (let i = 0; i < 2; i++) {
    const cat = random.pick(CATEGORIES);
    const related = random.shuffle(reportIds).slice(0, random.nextInt(5, 15));
    
    anomalies.push({
      id: `anom_${cat}_${city.replace(/\s/g, "_")}_spike_${i + 1}`,
      category: cat,
      type: "spike",
      area: city,
      title: `זינוק בדיווחי ${cat === "garbage" ? "אשפה" : cat === "lighting" ? "תאורה" : cat === "tree" ? "עצים" : "מפגעים"}`,
      description: `זוהה עלייה חריגה של ${related.length * 3}% בדיווחים בקטגוריה זו בתקופה האחרונה`,
      metrics: {
        currentCount: related.length * 3,
        baselineCount: related.length,
        pctChange: 200,
        zScore: random.nextFloat(2.5, 4.0),
      },
      relatedReports: related,
      severity: random.pick(["medium", "high"]) as "medium" | "high",
      status: "open",
      firstDetected: now - random.nextInt(1, 7) * 24 * 60 * 60 * 1000,
      lastUpdated: now,
      center,
    });
  }
  
  // 2 Slow Response anomalies
  for (let i = 0; i < 2; i++) {
    const cat = random.pick(CATEGORIES);
    const related = random.shuffle(reportIds).slice(0, random.nextInt(3, 10));
    
    anomalies.push({
      id: `anom_${cat}_${city.replace(/\s/g, "_")}_slow_response_${i + 1}`,
      category: cat,
      type: "slow_response",
      area: city,
      title: `איחור בטיפול בדיווחי ${cat === "garbage" ? "אשפה" : cat === "lighting" ? "תאורה" : cat === "tree" ? "עצים" : "מפגעים"}`,
      description: `זמן הטיפול הממוצע עלה ל-${random.nextInt(10, 20)} ימים, מעל ה-SLA`,
      metrics: {
        currentAvgDays: random.nextFloat(10, 20),
        baselineAvgDays: SLA_DAYS[cat],
        currentReports: related.length,
        pctChange: random.nextFloat(50, 150),
        threshold: SLA_DAYS[cat] * 1.5,
      },
      relatedReports: related,
      severity: random.pick(["low", "medium", "high"]) as "low" | "medium" | "high",
      status: "open",
      firstDetected: now - random.nextInt(3, 14) * 24 * 60 * 60 * 1000,
      lastUpdated: now,
      center: null,
    });
  }
  
  // 2 Geo Cluster anomalies
  for (let i = 0; i < 2; i++) {
    const cat = random.pick(CATEGORIES);
    const clusterCenter = generatePointInPolygon(polygon, random)!;
    const related = random.shuffle(reportIds).slice(0, random.nextInt(5, 12));
    
    anomalies.push({
      id: `anom_${cat}_${city.replace(/\s/g, "_")}_geo_cluster_${i + 1}`,
      category: cat,
      type: "geo_cluster",
      area: city,
      title: `ריכוז דיווחים גבוה ב${cat === "garbage" ? "אשפה" : cat === "lighting" ? "תאורה" : cat === "tree" ? "עצים" : "מפגעים"}`,
      description: `זוהה אשכול של ${related.length} דיווחים באזור מצומצם`,
      metrics: {
        clusterSize: related.length,
        radiusMeters: random.nextInt(100, 500),
        density: random.nextFloat(5, 15),
      },
      relatedReports: related,
      severity: random.pick(["medium", "high"]) as "medium" | "high",
      status: "open",
      firstDetected: now - random.nextInt(1, 5) * 24 * 60 * 60 * 1000,
      lastUpdated: now,
      center: clusterCenter,
    });
  }
  
  return anomalies;
}

// ============================================
// MAIN SEEDER
// ============================================

async function loadCityBoundaries(): Promise<Map<string, Coordinate[]>> {
  const boundariesPath = path.join(
    __dirname,
    "../../public/data/cities_municipal_boundaries.json"
  );
  
  console.log("📂 Loading city boundaries from:", boundariesPath);
  
  const data = fs.readFileSync(boundariesPath, "utf-8");
  const cities = JSON.parse(data) as { city: string; coordinates: Coordinate[] }[];
  
  const map = new Map<string, Coordinate[]>();
  for (const city of cities) {
    map.set(city.city, city.coordinates);
  }
  
  return map;
}

async function initializeFirebase(): Promise<admin.database.Database> {
  const serviceAccountPath = path.join(__dirname, "../../serviceAccountKey.json");
  
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error("❌ serviceAccountKey.json not found. Please add Firebase Admin credentials.");
  }
  
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
  
  // Check if already initialized
  try {
    admin.app(); // Will throw if not initialized
  } catch {
    // Not initialized, so initialize it
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
    });
  }
  
  return admin.database();
}

async function seedCity(
  db: admin.database.Database,
  city: string,
  polygon: Coordinate[],
  random: SeededRandom
): Promise<void> {
  console.log(`\n🏙️ Seeding city: ${city}`);
  console.log(`   📍 Polygon has ${polygon.length} vertices`);
  
  const reportIds: string[] = [];
  let writtenReports = 0;
  let writtenArchive = 0;
  
  // Generate active reports (last 12 months)
  console.log(`   📝 Generating ${REPORTS_PER_CITY} active reports...`);
  
  for (let i = 0; i < REPORTS_PER_CITY; i++) {
    const category = random.pick(CATEGORIES);
    
    // Status distribution: 15% open, 15% pending, 20% in progress, 50% resolved
    const statusRand = random.next();
    let status: Status;
    if (statusRand < 0.15) status = "open";
    else if (statusRand < 0.30) status = "pending";
    else if (statusRand < 0.50) status = "in progress";
    else status = "resolved";
    
    // Age: 0-365 days for active reports
    const ageInDays = random.nextInt(0, 365);
    
    const report = generateReport(city, polygon, category, status, ageInDays, random);
    if (!report) continue;
    
    const reportRef = db.ref(`Reports/${category}`).push();
    await reportRef.set(report);
    reportIds.push(reportRef.key!);
    writtenReports++;
  }
  
  console.log(`   ✅ Written ${writtenReports} active reports`);
  
  // Generate archive reports (>1 year old)
  console.log(`   📦 Generating ${ARCHIVE_REPORTS_PER_CITY} archive reports...`);
  
  const archiveYears = [2022, 2023]; // Years for archive
  
  for (let i = 0; i < ARCHIVE_REPORTS_PER_CITY; i++) {
    const category = random.pick(CATEGORIES);
    const year = random.pick(archiveYears);
    
    // Age: 400-800 days (older than 1 year)
    const ageInDays = random.nextInt(400, 800);
    
    const report = generateReport(city, polygon, category, "resolved", ageInDays, random);
    if (!report) continue;
    
    // Add archive-specific fields
    const archivedReport = {
      ...report,
      archivedYear: year,
      archivedCity: city,
    };
    
    const archiveRef = db.ref(`ArchivedReports/${year}/${category}`).push();
    await archiveRef.set(archivedReport);
    writtenArchive++;
  }
  
  console.log(`   ✅ Written ${writtenArchive} archive reports`);
  
  // Generate anomalies
  console.log(`   🚨 Generating 6 anomalies...`);
  
  const anomalies = generateAnomalies(city, polygon, reportIds, random);
  
  for (const anomaly of anomalies) {
    // Write to ActiveAnomalies
    await db.ref(`Anomalies/ActiveAnomalies/${anomaly.id}`).set(anomaly);
    
    // Initialize empty ActiveAnomaliesUpdates entry
    await db.ref(`Anomalies/ActiveAnomaliesUpdates/${anomaly.id}`).set({});
  }
  
  console.log(`   ✅ Written ${anomalies.length} anomalies`);
  console.log(`   🎉 City ${city} seeding complete!`);
}

async function main(): Promise<void> {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║     MuniMap Realistic Data Seeder                  ║");
  console.log("║     🚨 ADMIN-ONLY - DO NOT RUN IN PRODUCTION       ║");
  console.log("╚════════════════════════════════════════════════════╝\n");
  
  try {
    // Initialize
    const boundaries = await loadCityBoundaries();
    const db = await initializeFirebase();
    const random = new SeededRandom(SEED);
    
    console.log(`🌱 Using seed: ${SEED}`);
    console.log(`🎯 Target cities: ${TARGET_CITIES.join(", ")}\n`);
    
    // Validate cities exist
    for (const city of TARGET_CITIES) {
      if (!boundaries.has(city)) {
        throw new Error(`❌ City "${city}" not found in boundaries file`);
      }
    }
    
    // Seed each city
    for (const city of TARGET_CITIES) {
      const polygon = boundaries.get(city)!;
      await seedCity(db, city, polygon, random);
    }
    
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║     ✅ SEEDING COMPLETE                             ║");
    console.log("╚════════════════════════════════════════════════════╝");
    console.log(`\nTotal per city:`);
    console.log(`  - Active reports: ${REPORTS_PER_CITY}`);
    console.log(`  - Archive reports: ${ARCHIVE_REPORTS_PER_CITY}`);
    console.log(`  - Anomalies: 6 (2 spike, 2 slow_response, 2 geo_cluster)`);
    console.log(`\nTotal overall: ${TARGET_CITIES.length * (REPORTS_PER_CITY + ARCHIVE_REPORTS_PER_CITY)} reports + ${TARGET_CITIES.length * 6} anomalies`);
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

main();
