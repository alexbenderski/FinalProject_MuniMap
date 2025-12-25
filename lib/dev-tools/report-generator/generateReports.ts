/**
 * Test Report Generator - Pure Generation Logic
 * 
 * This module generates mock reports for QA/testing purposes.
 * It contains NO side effects and is purely functional.
 * 
 * To remove this feature:
 * 1. Delete the /lib/dev-tools/report-generator folder
 * 2. Remove the import and button from dashboard/page.tsx
 */

import { Report, ReportStatus, statusHistoryEntry } from "@/lib/types";
import { CATEGORIES, Category } from "@/lib/categories";

// ============================================
// Types
// ============================================

export type EndStatus = "open" | "pending" | "in progress" | "resolved";

export interface GeneratorConfig {
  timeRangeStart: number;   // Unix timestamp (ms)
  timeRangeEnd: number;     // Unix timestamp (ms)
  endStatus: EndStatus;
  reportType: Category;
  clusterCenter: { lat: number; lng: number };
  radiusMeters: number;
  count: number;
  cityBoundary: { lat: number; lng: number }[]; // City polygon for validation
  area: string;             // City name
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface GeneratedReport extends Report {
  generatedId: string;  // Pre-generated ID for Firebase path
}

// ============================================
// Status Progression Constants
// ============================================

const STATUS_ORDER: ReportStatus[] = ["open", "pending", "in progress", "resolved"];

function getStatusIndex(status: ReportStatus): number {
  return STATUS_ORDER.indexOf(status);
}

function getRequiredStatuses(endStatus: EndStatus): ReportStatus[] {
  const endIndex = getStatusIndex(endStatus as ReportStatus);
  return STATUS_ORDER.slice(0, endIndex + 1);
}

// ============================================
// Validation Functions
// ============================================

export function validateConfig(config: GeneratorConfig): ValidationResult {
  const errors: string[] = [];

  // Time range validation
  if (config.timeRangeStart >= config.timeRangeEnd) {
    errors.push("Start time must be before end time");
  }

  if (config.timeRangeEnd > Date.now()) {
    errors.push("End time cannot be in the future");
  }

  // Count validation
  if (config.count < 1 || config.count > 100) {
    errors.push("Report count must be between 1 and 100");
  }

  // Radius validation
  if (config.radiusMeters < 10 || config.radiusMeters > 10000) {
    errors.push("Radius must be between 10 and 10,000 meters");
  }

  // Report type validation
  if (!CATEGORIES.includes(config.reportType)) {
    errors.push(`Invalid report type: ${config.reportType}`);
  }

  // End status validation
  if (!STATUS_ORDER.includes(config.endStatus as ReportStatus)) {
    errors.push(`Invalid end status: ${config.endStatus}`);
  }

  // City boundary validation
  if (!config.cityBoundary || config.cityBoundary.length < 3) {
    errors.push("City boundary must have at least 3 points");
  }

  // Cluster center must be roughly near the city
  if (config.cityBoundary && config.cityBoundary.length >= 3) {
    const avgLat = config.cityBoundary.reduce((sum, p) => sum + p.lat, 0) / config.cityBoundary.length;
    const avgLng = config.cityBoundary.reduce((sum, p) => sum + p.lng, 0) / config.cityBoundary.length;
    const distanceKm = haversineDistance(config.clusterCenter.lat, config.clusterCenter.lng, avgLat, avgLng);
    if (distanceKm > 50) {
      errors.push("Cluster center is too far from city center (>50km)");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateTimestampProgression(timestamps: { status: ReportStatus; time: number }[]): ValidationResult {
  const errors: string[] = [];

  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i].time <= timestamps[i - 1].time) {
      errors.push(
        `Invalid timestamp order: ${timestamps[i - 1].status} (${new Date(timestamps[i - 1].time).toISOString()}) ` +
        `must be before ${timestamps[i].status} (${new Date(timestamps[i].time).toISOString()})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Geometry Utilities
// ============================================

/**
 * Calculate distance between two points in km using Haversine formula
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function pointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    const intersect = ((yi > point.lat) !== (yj > point.lat))
      && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Generate a random point within a given radius of a center point
 */
function randomPointInRadius(
  center: { lat: number; lng: number },
  radiusMeters: number
): { lat: number; lng: number } {
  // Random angle
  const angle = Math.random() * 2 * Math.PI;
  // Random distance (using square root for uniform distribution in circle)
  const distance = Math.sqrt(Math.random()) * radiusMeters;

  // Convert to lat/lng offset (approximate)
  const latOffset = (distance / 1000) / 111.32; // 1 degree lat ≈ 111.32 km
  const lngOffset = (distance / 1000) / (111.32 * Math.cos(center.lat * Math.PI / 180));

  return {
    lat: center.lat + latOffset * Math.sin(angle),
    lng: center.lng + lngOffset * Math.cos(angle),
  };
}

/**
 * Generate a point that's both within the radius and inside the city boundary
 */
function generateValidPoint(
  center: { lat: number; lng: number },
  radiusMeters: number,
  cityBoundary: { lat: number; lng: number }[],
  maxAttempts: number = 100
): { lat: number; lng: number } | null {
  for (let i = 0; i < maxAttempts; i++) {
    const point = randomPointInRadius(center, radiusMeters);
    if (pointInPolygon(point, cityBoundary)) {
      return point;
    }
  }
  return null;
}

// ============================================
// Randomization Utilities
// ============================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomDescription(type: Category): string {
  const descriptions: Record<Category, string[]> = {
    garbage: [
      "Large pile of garbage on the street corner",
      "Overflowing trash bin needs collection",
      "Illegal dumping site discovered",
      "Construction waste left on sidewalk",
      "Broken garbage bin attracting pests",
    ],
    lighting: [
      "Street light not working for several days",
      "Flickering light causing visibility issues",
      "Broken lamp post after storm",
      "Dark area due to multiple light failures",
      "Light pole leaning dangerously",
    ],
    tree: [
      "Fallen tree blocking path",
      "Dangerous branch hanging over road",
      "Tree roots damaging sidewalk",
      "Dead tree needs removal",
      "Overgrown tree blocking traffic signs",
    ],
    hazard: [
      "Deep pothole on main road",
      "Broken manhole cover",
      "Flooded street after rain",
      "Damaged guardrail on bridge",
      "Cracked pavement creating trip hazard",
    ],
    animal: [
      "Stray dogs in residential area",
      "Dead animal on roadside needs removal",
      "Aggressive wildlife spotted",
      "Animal nest in public infrastructure",
      "Injured animal needs assistance",
    ],
    maintenance: [
      "Broken bench in public park",
      "Damaged playground equipment",
      "Graffiti on public building",
      "Broken water fountain",
      "Worn-out road markings",
    ],
    pest: [
      "Rat infestation reported",
      "Wasp nest near playground",
      "Cockroach problem in public area",
      "Mosquito breeding site found",
      "Ant colony damaging infrastructure",
    ],
  };

  return randomElement(descriptions[type]);
}

function generateRandomAddress(city: string): string {
  const streets = [
    "Main Street", "Oak Avenue", "Park Boulevard", "Central Road",
    "Market Street", "Garden Lane", "River Drive", "Hill Road",
    "Station Street", "Harbor Way", "School Road", "Library Lane",
  ];
  const number = randomInt(1, 200);
  return `${number} ${randomElement(streets)}, ${city}`;
}

function generateRandomEmail(): string {
  const names = ["user", "citizen", "resident", "reporter", "tester"];
  const domains = ["test.com", "example.org", "demo.net"];
  return `${randomElement(names)}${randomInt(1, 999)}@${randomElement(domains)}`;
}

function generateRandomPhone(): string {
  return `05${randomInt(0, 9)}-${randomInt(1000000, 9999999)}`;
}

function generateUniqueId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================
// Timestamp Generation
// ============================================

interface StatusTimestamps {
  openAt: number;
  pendingAt?: number;
  inProgressAt?: number;
  resolvedAt?: number;
}

function generateStatusTimestamps(
  endStatus: EndStatus,
  rangeStart: number,
  rangeEnd: number
): StatusTimestamps {
  const requiredStatuses = getRequiredStatuses(endStatus);
  const statusCount = requiredStatuses.length;

  // Divide the time range into segments
  const totalDuration = rangeEnd - rangeStart;
  const segmentDuration = totalDuration / statusCount;

  // Generate timestamps for each status
  const timestamps: StatusTimestamps = {
    openAt: rangeStart + randomInt(0, Math.floor(segmentDuration * 0.8)),
  };

  let lastTime = timestamps.openAt;

  if (requiredStatuses.includes("pending")) {
    const minTime = lastTime + 60000; // At least 1 minute later
    const maxTime = rangeStart + segmentDuration * 2;
    timestamps.pendingAt = randomInt(minTime, Math.max(minTime + 1, maxTime));
    lastTime = timestamps.pendingAt;
  }

  if (requiredStatuses.includes("in progress")) {
    const minTime = lastTime + 60000;
    const maxTime = rangeStart + segmentDuration * 3;
    timestamps.inProgressAt = randomInt(minTime, Math.max(minTime + 1, maxTime));
    lastTime = timestamps.inProgressAt;
  }

  if (requiredStatuses.includes("resolved")) {
    const minTime = lastTime + 60000;
    const maxTime = rangeEnd;
    timestamps.resolvedAt = randomInt(minTime, Math.max(minTime + 1, maxTime));
  }

  return timestamps;
}

function buildStatusHistory(
  timestamps: StatusTimestamps,
  endStatus: EndStatus
): statusHistoryEntry[] {
  const history: statusHistoryEntry[] = [];
  const updatedBy = "test_generator";

  history.push({
    status: "open",
    updatedAt: timestamps.openAt,
    updatedBy,
  });

  if (timestamps.pendingAt && getStatusIndex(endStatus as ReportStatus) >= 1) {
    history.push({
      status: "pending",
      updatedAt: timestamps.pendingAt,
      updatedBy,
    });
  }

  if (timestamps.inProgressAt && getStatusIndex(endStatus as ReportStatus) >= 2) {
    history.push({
      status: "in progress",
      updatedAt: timestamps.inProgressAt,
      updatedBy,
    });
  }

  if (timestamps.resolvedAt && endStatus === "resolved") {
    history.push({
      status: "resolved",
      updatedAt: timestamps.resolvedAt,
      updatedBy,
    });
  }

  return history;
}

// ============================================
// Main Generation Function
// ============================================

export function generateReports(config: GeneratorConfig): { reports: GeneratedReport[]; errors: string[] } {
  // Validate config first
  const validation = validateConfig(config);
  if (!validation.valid) {
    return { reports: [], errors: validation.errors };
  }

  const reports: GeneratedReport[] = [];
  const errors: string[] = [];

  for (let i = 0; i < config.count; i++) {
    // Generate valid point within city boundary
    const point = generateValidPoint(
      config.clusterCenter,
      config.radiusMeters,
      config.cityBoundary
    );

    if (!point) {
      errors.push(`Could not generate valid point ${i + 1} within city boundary. Try adjusting cluster center or radius.`);
      continue;
    }

    // Generate timestamps
    const timestamps = generateStatusTimestamps(
      config.endStatus,
      config.timeRangeStart,
      config.timeRangeEnd
    );

    // Validate timestamp progression
    const timestampEntries: { status: ReportStatus; time: number }[] = [
      { status: "open", time: timestamps.openAt },
    ];
    if (timestamps.pendingAt) timestampEntries.push({ status: "pending", time: timestamps.pendingAt });
    if (timestamps.inProgressAt) timestampEntries.push({ status: "in progress", time: timestamps.inProgressAt });
    if (timestamps.resolvedAt) timestampEntries.push({ status: "resolved", time: timestamps.resolvedAt });

    const timestampValidation = validateTimestampProgression(timestampEntries);
    if (!timestampValidation.valid) {
      errors.push(...timestampValidation.errors.map(e => `Report ${i + 1}: ${e}`));
      continue;
    }

    // Build status history
    const statusHistory = buildStatusHistory(timestamps, config.endStatus);

    // Generate unique ID
    const generatedId = generateUniqueId();

    // Create the report
    const report: GeneratedReport = {
      generatedId,
      id: generatedId,
      area: config.area,
      type: config.reportType,
      description: generateRandomDescription(config.reportType),
      lat: point.lat,
      lng: point.lng,
      address: generateRandomAddress(config.area),
      status: config.endStatus as ReportStatus,
      timestamp: timestamps.openAt,
      resolvedAt: timestamps.resolvedAt ?? 0,
      media: false, // Test reports don't have media
      submittedBy: "Test Generator",
      email: generateRandomEmail(),
      phone: generateRandomPhone(),
      statusHistory,
      updatedBy: "test_generator",
      updatedAt: statusHistory[statusHistory.length - 1].updatedAt,
      deleted: false,
    };

    reports.push(report);
  }

  return { reports, errors };
}

// ============================================
// Exports for UI
// ============================================

export { CATEGORIES };
export const STATUS_OPTIONS: EndStatus[] = ["open", "pending", "in progress", "resolved"];
