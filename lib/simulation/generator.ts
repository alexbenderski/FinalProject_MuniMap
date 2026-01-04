/**
 * Report Generator
 * Generates realistic municipal reports based on configuration
 */

import {
  SimulationConfig,
  ReportCategory,
  GeneratedReport,
} from "./types";

// Seeded random number generator for reproducible runs
class SeededRandom {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  // Linear congruential generator
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// Description templates per category
const DESCRIPTION_TEMPLATES: Record<ReportCategory, string[]> = {
  garbage: [
    "פח אשפה מלא ברחוב",
    "אשפה מפוזרת ליד הפח",
    "פח שבור וזקוק להחלפה",
    "הצטברות פסולת ליד מכולה",
    "פח לא רוקן כבר מספר ימים",
    "ריח רע מפח האשפה",
    "פסולת בניין מושלכת ברחוב",
    "שקיות אשפה מחוץ לפח",
  ],
  lighting: [
    "עמוד תאורה לא עובד",
    "תאורת רחוב מהבהבת",
    "נורה שרופה בעמוד",
    "חושך באזור בגלל תאורה לקויה",
    "עמוד תאורה נפל",
    "תאורה חלשה מאוד",
    "כבל תאורה חשוף",
    "פנס רחוב שבור",
  ],
  tree: [
    "עץ נפל על המדרכה",
    "ענף גדול עומד ליפול",
    "עץ חולה וזקוק לטיפול",
    "שורשים פורצים מהמדרכה",
    "עץ חוסם את הנוף לנהגים",
    "עלים יבשים מסוכנים",
    "עץ גבוה ליד קווי חשמל",
    "צורך בגיזום דחוף",
  ],
  hazard: [
    "בור במדרכה",
    "מכסה ביוב פתוח",
    "מעקה שבור",
    "מדרגות מסוכנות",
    "ספסל שבור בגינה",
    "זכוכיות שבורות על המדרכה",
    "מפגע בטיחותי ליד בית ספר",
    "מעבר חצייה לא מסומן",
  ],
};

// Street name templates
const STREET_NAMES = [
  "הרצל",
  "ויצמן",
  "בן גוריון",
  "ז'בוטינסקי",
  "רוטשילד",
  "אלנבי",
  "דיזנגוף",
  "ביאליק",
  "אחד העם",
  "שינקין",
  "פלורנטין",
  "נחלת בנימין",
  "לילנבלום",
  "מוהליבר",
  "שלמה המלך",
  "יהודה הלוי",
  "אבן גבירול",
  "קינג ג'ורג'",
  "בוגרשוב",
  "גורדון",
];

export class SimulationGenerator {
  private config: SimulationConfig;
  private random: SeededRandom;
  private reportCounter: number = 0;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.random = new SeededRandom(config.seed);
  }

  /**
   * Generate age in days based on desired criticality distribution
   * 25% green, 25% yellow, 25% orange, 25% red
   * 
   * SLA thresholds from lib/server/sla.ts:
   * - Green: ageDays < sla * 0.5
   * - Yellow: sla * 0.5 <= ageDays <= sla
   * - Orange: sla < ageDays <= sla * 2
   * - Red: ageDays > sla * 2
   */
  private generateAgeForCriticality(category: ReportCategory): number {
    // SLA days for each category (from lib/server/sla.ts)
    const SLA_DAYS: Record<string, number> = {
      garbage: 5,
      lighting: 7,
      tree: 8,
      hazard: 7,
    };

    const sla = SLA_DAYS[category] || 7;
    
    // Pick a criticality level (25% chance each)
    const rand = this.random.next();
    
    if (rand < 0.25) {
      // Green: 0 to (sla*0.5 - 1) days - so Math.floor gives < sla*0.5
      // For garbage (sla=5): 0 to 1.5 days
      // For lighting (sla=7): 0 to 2.5 days
      const maxDays = Math.max(0.5, sla * 0.5 - 0.5);
      return this.random.nextFloat(0, maxDays);
    } else if (rand < 0.5) {
      // Yellow: sla*0.5 to sla days - so Math.floor gives >= sla*0.5 and <= sla
      // For garbage (sla=5): 2.5 to 5 days
      // For lighting (sla=7): 3.5 to 7 days
      const minDays = sla * 0.5;
      const maxDays = sla;
      return this.random.nextFloat(minDays, maxDays);
    } else if (rand < 0.75) {
      // Orange: sla+1 to sla*2 days - so Math.floor gives > sla and <= sla*2
      // For garbage (sla=5): 6 to 10 days
      // For lighting (sla=7): 8 to 14 days
      const minDays = sla + 1;
      const maxDays = sla * 2;
      return this.random.nextFloat(minDays, maxDays);
    } else {
      // Red: > sla*2 days - so Math.floor gives > sla*2
      // For garbage (sla=5): 11 to 20 days
      // For lighting (sla=7): 15 to 25 days
      const minDays = sla * 2 + 1;
      const maxDays = sla * 3;
      return this.random.nextFloat(minDays, maxDays);
    }
  }

  /**
   * Predict criticality color based on age and category
   */
  private predictCriticality(category: ReportCategory, ageDays: number): string {
    const SLA_DAYS: Record<string, number> = {
      garbage: 5,
      lighting: 7,
      tree: 8,
      hazard: 7,
    };
    const sla = SLA_DAYS[category] || 7;
    
    if (ageDays > sla * 2) return "red";
    if (ageDays > sla) return "orange";
    if (ageDays >= sla * 0.5) return "yellow";
    return "green";
  }

  /**
   * Generate a single report with complete structure
   * Reports are created with PAST timestamps to be realistic
   */
  generateReport(timestamp?: number): GeneratedReport {
    const category = this.pickCategory();
    const status = this.pickStatus();
    const location = this.generateLocation();
    
    this.reportCounter++;
    const id = `sim_${Date.now()}_${this.reportCounter}_${this.random.nextInt(1000, 9999)}`;

    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    // Generate age based on desired criticality distribution (25% each color)
    // Only use the calculated age if no specific timestamp is passed
    const daysAgo = this.generateAgeForCriticality(category);
    const calculatedTimestamp = now - Math.floor(daysAgo) * msPerDay - this.random.nextInt(0, msPerDay / 2);
    const reportTimestamp = timestamp ?? calculatedTimestamp;

    // Log for debugging criticality distribution
    const ageDays = Math.floor((now - reportTimestamp) / msPerDay);
    console.log(`🎯 Generated ${category} report: ${daysAgo.toFixed(1)} days old → actual age: ${ageDays} days → should be ${this.predictCriticality(category, ageDays)}`);

    // Generate status history with proper transitions (all in the past)
    const { statusHistory, timestamps } = this.generateStatusHistory(status, reportTimestamp, now);
    
    // Get the latest timestamp from status history (should still be in the past)
    const latestStatusEntry = statusHistory[statusHistory.length - 1];
    const latestTimestamp = Math.min(latestStatusEntry.updatedAt, now);

    const report: GeneratedReport = {
      id,
      type: category,
      description: this.random.pick(DESCRIPTION_TEMPLATES[category]),
      area: this.config.cityName,
      address: this.generateAddress(),
      lat: location.lat,
      lng: location.lng,
      status,
      timestamp: reportTimestamp,
      openedAt: reportTimestamp,
      deleted: false,
      email: this.generateEmail(),
      phone: this.generatePhone(),
      media: this.random.next() < 0.3, // 30% chance of having media
      submittedBy: "SimulationBot",
      updatedAt: latestTimestamp,
      updatedBy: "SimulationBot",
      statusHistory,
    };

    // Add status-specific timestamps from the generated history
    if (timestamps.pendingAt) {
      report.pendingAt = timestamps.pendingAt;
    }
    if (timestamps.inProgressAt) {
      report.inProgressAt = timestamps.inProgressAt;
    }
    if (timestamps.resolvedAt) {
      report.resolvedAt = timestamps.resolvedAt;
    }

    return report;
  }

  /**
   * Generate status history with proper transitions
   * Creates realistic multi-day gaps between each status transition
   * All timestamps are guaranteed to be in the past
   */
  private generateStatusHistory(
    finalStatus: "open" | "pending" | "in progress" | "resolved",
    startTime: number,
    maxTime: number
  ): {
    statusHistory: Array<{
      status: "open" | "pending" | "in progress" | "resolved";
      updatedAt: number;
      updatedBy: string;
    }>;
    timestamps: {
      pendingAt?: number;
      inProgressAt?: number;
      resolvedAt?: number;
    };
  } {
    const history: Array<{
      status: "open" | "pending" | "in progress" | "resolved";
      updatedAt: number;
      updatedBy: string;
    }> = [];

    const msPerHour = 60 * 60 * 1000;
    const msPerDay = 24 * msPerHour;
    
    // Calculate available time window (from report creation to now)
    const availableTime = maxTime - startTime;
    
    // Determine number of transitions needed
    const statusOrder = ["open", "pending", "in progress", "resolved"] as const;
    const finalIndex = statusOrder.indexOf(finalStatus);
    const transitionCount = finalIndex; // Number of transitions after 'open'
    
    // Divide available time among transitions (with some randomness)
    // Reserve some time for each transition: 1-3 days per transition
    const timestamps: {
      pendingAt?: number;
      inProgressAt?: number;
      resolvedAt?: number;
    } = {};
    
    let currentTime = startTime;

    // Always start with open
    history.push({
      status: "open",
      updatedAt: currentTime,
      updatedBy: "SimulationBot",
    });

    if (transitionCount > 0) {
      // Calculate time per transition step
      const baseTimePerStep = Math.min(
        availableTime / transitionCount,
        3 * msPerDay // Cap at 3 days per step
      );
      
      // Transition to pending (1-2 days after open)
      if (finalStatus === "pending" || finalStatus === "in progress" || finalStatus === "resolved") {
        const pendingDelay = Math.min(
          this.random.nextInt(12, 48) * msPerHour, // 12-48 hours
          baseTimePerStep * 0.3
        );
        currentTime += Math.max(pendingDelay, 2 * msPerHour); // At least 2 hours
        currentTime = Math.min(currentTime, maxTime - msPerHour); // Keep in past
        
        timestamps.pendingAt = currentTime;
        history.push({
          status: "pending",
          updatedAt: currentTime,
          updatedBy: "SimulationBot",
        });
      }

      // Transition to in progress (1-3 days after pending)
      if (finalStatus === "in progress" || finalStatus === "resolved") {
        const inProgressDelay = Math.min(
          this.random.nextInt(1, 3) * msPerDay + this.random.nextInt(0, 12) * msPerHour, // 1-3.5 days
          baseTimePerStep * 0.5
        );
        currentTime += Math.max(inProgressDelay, 6 * msPerHour); // At least 6 hours
        currentTime = Math.min(currentTime, maxTime - msPerHour); // Keep in past
        
        timestamps.inProgressAt = currentTime;
        history.push({
          status: "in progress",
          updatedAt: currentTime,
          updatedBy: "SimulationBot",
        });
      }

      // Transition to resolved (2-5 days after in progress based on avgResolutionDays)
      if (finalStatus === "resolved") {
        const avgResolutionMs = this.config.avgResolutionDays * msPerDay;
        const resolutionDelay = avgResolutionMs * (0.5 + this.random.next() * 0.5); // 50-100% of avg
        const clampedDelay = Math.min(resolutionDelay, maxTime - currentTime - msPerHour);
        currentTime += Math.max(clampedDelay, 12 * msPerHour); // At least 12 hours
        currentTime = Math.min(currentTime, maxTime - msPerHour); // Keep in past
        
        timestamps.resolvedAt = currentTime;
        history.push({
          status: "resolved",
          updatedAt: currentTime,
          updatedBy: "SimulationBot",
        });
      }
    }

    return { statusHistory: history, timestamps };
  }

  /**
   * Generate realistic email
   */
  private generateEmail(): string {
    const domains = ["gmail.com", "walla.co.il", "yahoo.com", "hotmail.com"];
    const names = ["user", "resident", "citizen", "reporter"];
    const name = this.random.pick(names);
    const number = this.random.nextInt(100, 9999);
    const domain = this.random.pick(domains);
    return `${name}${number}@${domain}`;
  }

  /**
   * Generate realistic Israeli phone number
   */
  private generatePhone(): string {
    const prefix = this.random.pick(["050", "052", "053", "054", "055", "058"]);
    const suffix = this.random.nextInt(1000000, 9999999);
    return `${prefix}${suffix}`;
  }

  /**
   * Generate multiple reports
   * Each report gets its own age calculated for balanced criticality distribution
   */
  generateBatch(count: number, startTime?: number, endTime?: number): GeneratedReport[] {
    const reports: GeneratedReport[] = [];
    
    console.log(`📦 generateBatch called with: count=${count}, startTime=${startTime}, endTime=${endTime}`);
    
    // If specific time range is provided, use it
    // Otherwise, let generateReport calculate age-based timestamps for 25/25/25/25 distribution
    if (startTime !== undefined && endTime !== undefined) {
      // Manual time range mode - spread reports across the range
      console.log(`⚠️ Using manual time range mode - will NOT use balanced criticality`);
      for (let i = 0; i < count; i++) {
        const timestamp = startTime + 
          (endTime - startTime) * (i / Math.max(count - 1, 1)) +
          this.random.nextInt(-60000, 60000); // Add some jitter
        
        reports.push(this.generateReport(timestamp));
      }
    } else {
      // Automatic mode - each report calculates its own age for balanced criticality
      console.log(`✅ Using automatic mode - balanced criticality distribution`);
      for (let i = 0; i < count; i++) {
        reports.push(this.generateReport()); // No timestamp = use age-based calculation
      }
    }

    return reports;
  }

  /**
   * Pick a category based on weights
   */
  private pickCategory(): ReportCategory {
    if (this.config.mode === "controlled" && this.config.categoryWeights) {
      // Use category weights for controlled mode
      const weights = this.config.categoryWeights;
      const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
      
      let random = this.random.next() * totalWeight;
      for (const w of weights) {
        random -= w.weight;
        if (random <= 0) {
          return w.category;
        }
      }
    }
    
    // Random mode - equal probability
    return this.random.pick(this.config.categories);
  }

  /**
   * Pick a status based on distribution
   */
  private pickStatus(): "open" | "pending" | "in progress" | "resolved" {
    if (!this.config.includeResolvedReports) {
      return "open";
    }

    const dist = this.config.statusDistribution ?? {
      open: 40,
      pending: 25,
      inProgress: 20,
      resolved: 15,
    };

    const total = dist.open + dist.pending + dist.inProgress + dist.resolved;
    let random = this.random.next() * total;

    if (random < dist.open) return "open";
    random -= dist.open;
    if (random < dist.pending) return "pending";
    random -= dist.pending;
    if (random < dist.inProgress) return "in progress";
    return "resolved";
  }

  /**
   * Generate a location within city bounds using random 800m radius
   */
  private generateLocation(): { lat: number; lng: number } {
    if (!this.config.useRandomLocations) {
      // Default center (Nesher)
      return { lat: 32.9167, lng: 35.1333 };
    }

    if (this.config.cityBoundary && this.config.cityBoundary.length >= 3) {
      // Generate point using random 800m radius approach
      return this.generatePointInPolygonWithRadius(this.config.cityBoundary);
    }

    // Fallback: random within Nesher area
    return {
      lat: this.random.nextFloat(32.9, 32.933),
      lng: this.random.nextFloat(35.115, 35.152),
    };
  }

  /**
   * Generate a point inside a polygon using random 800m radius
   * Picks random center in city, generates point in 800m radius, checks if inside polygon
   */
  private generatePointInPolygonWithRadius(polygon: { lat: number; lng: number }[]): { lat: number; lng: number } {
    // Calculate bounding box and centroid
    const lats = polygon.map(p => p.lat);
    const lngs = polygon.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Try up to 100 times to find a valid point
    for (let attempt = 0; attempt < 100; attempt++) {
      // Pick a random center point anywhere in the city bounds
      const randomCenterLat = this.random.nextFloat(minLat, maxLat);
      const randomCenterLng = this.random.nextFloat(minLng, maxLng);

      // Generate point within 800m radius of this random center
      // 800m ≈ 0.0072 degrees latitude, ~0.0095 degrees longitude (at 32° lat)
      const radiusLat = 0.0072;
      const radiusLng = 0.0095;
      
      // Random angle and distance
      const angle = this.random.nextFloat(0, 2 * Math.PI);
      const distance = Math.sqrt(this.random.next()) * 1; // Uniform distribution in circle
      
      const lat = randomCenterLat + (distance * radiusLat * Math.cos(angle));
      const lng = randomCenterLng + (distance * radiusLng * Math.sin(angle));

      // Check if point is inside the city polygon
      if (this.isPointInPolygon({ lat, lng }, polygon)) {
        return { lat, lng };
      }
    }

    // Fallback: return centroid
    return {
      lat: centerLat,
      lng: centerLng,
    };
  }

  /**
   * Generate a point inside a polygon (legacy method - kept for compatibility)
   */
  private generatePointInPolygon(polygon: { lat: number; lng: number }[]): { lat: number; lng: number } {
    // Calculate bounding box
    const lats = polygon.map(p => p.lat);
    const lngs = polygon.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Try up to 100 times to find a point inside the polygon
    for (let attempt = 0; attempt < 100; attempt++) {
      const lat = this.random.nextFloat(minLat, maxLat);
      const lng = this.random.nextFloat(minLng, maxLng);

      if (this.isPointInPolygon({ lat, lng }, polygon)) {
        return { lat, lng };
      }
    }

    // Fallback: return centroid
    return {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    };
  }

  /**
   * Check if point is inside polygon (ray casting algorithm)
   */
  private isPointInPolygon(
    point: { lat: number; lng: number },
    polygon: { lat: number; lng: number }[]
  ): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      if (
        yi > point.lat !== yj > point.lat &&
        point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Generate a realistic address
   */
  private generateAddress(): string {
    const street = this.random.pick(STREET_NAMES);
    const number = this.random.nextInt(1, 150);
    return `${street} ${number}, ${this.config.cityName}`;
  }

  /**
   * Reset the generator state
   */
  reset(): void {
    this.reportCounter = 0;
    this.random = new SeededRandom(this.config.seed);
  }
}
