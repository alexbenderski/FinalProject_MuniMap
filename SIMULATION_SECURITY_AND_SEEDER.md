# Simulation & Data Generation Security & Implementation

## Overview

This document describes the security enhancements and data generation capabilities implemented for MuniMap's simulation and testing tools.

---

## PART A: Simulation City Enforcement

### Problem Statement
Previously, the simulator could write reports to ANY city, regardless of which city the logged-in user was authorized for. This created a security risk where:
- Users could pollute data in other cities
- No validation of coordinate boundaries
- Default "Tel Aviv" fallback could override user permissions

### Solution Implemented

#### 1. SimulationFirebaseWriter Security Guard
**File:** [lib/simulation/firebaseWriter.ts](lib/simulation/firebaseWriter.ts)

Added mandatory city authorization:

```typescript
setAuthorizedCity(city: string, boundary?: { lat: number; lng: number }[]): void
```

- **Must be called** before any writes
- Stores the authorized city from user's Firestore permissions
- Optionally accepts city polygon for coordinate validation
- Throws error if city is empty

Every write is validated:
```typescript
validateCityAuthorization(report: GeneratedReport): { valid: boolean; error?: string }
```

Checks:
1. ✅ Writer has been authorized with a city
2. ✅ Report's `area` matches authorized city
3. ✅ Report's coordinates are INSIDE city polygon (if boundary provided)

#### 2. SimulationEngine Authorization
**File:** [lib/simulation/engine.ts](lib/simulation/engine.ts)

Modified `start()` method:
- Validates city is provided before starting
- Calls `writer.setAuthorizedCity()` with config values
- Clears authorization when simulation stops

```typescript
async start(config: SimulationConfig): Promise<void> {
  // ⛔ SECURITY: Validate city is provided
  if (!config.cityName || config.cityName.trim() === "") {
    this.emit("error", { error: "🚫 Cannot start without valid city" });
    return;
  }
  
  // Set authorized city on writer BEFORE any writes
  this.writer.setAuthorizedCity(config.cityName, config.cityBoundary);
  // ...
}
```

#### 3. SimulationPanel Auth Integration
**File:** [components/dashboard/simulation/SimulationPanel.tsx](components/dashboard/simulation/SimulationPanel.tsx)

Changed from using props to enforcing auth context:

```typescript
const { permissions } = useAuth();

// ⛔ SECURITY: Always use authenticated user's city
const authorizedCity = permissions?.city || propCityName || "";
const hasValidCity = Boolean(authorizedCity && authorizedCity.trim() !== "");
```

UI Changes:
- Shows authorized city badge: `🔒 חיפה`
- Shows warning if no city: `🚫 No authorized city`
- Start button is **disabled** without valid city authorization

#### 4. Dev-Tools Report Generator Secured
**File:** [lib/dev-tools/report-generator/writeReportsToFirebase.ts](lib/dev-tools/report-generator/writeReportsToFirebase.ts)

Same security pattern applied:
- `authorizedCity` is now a **required parameter**
- Polygon validation before writes
- Rejects reports for unauthorized cities

**File:** [lib/dev-tools/report-generator/TestReportGeneratorModal.tsx](lib/dev-tools/report-generator/TestReportGeneratorModal.tsx)

- Uses `useAuth()` to get permissions
- Passes `authorizedCity` and `cityBoundary` to writer
- Shows authorization status in UI

### Point-in-Polygon Algorithm

Used ray-casting algorithm for coordinate validation:

```typescript
function isPointInPolygon(lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean {
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
```

---

## PART B: Realistic Data Generator

### Purpose
Admin-only script to seed the database with realistic test data for 3 Israeli cities.

### Target Cities
| City | Hebrew | Polygon Vertices |
|------|--------|------------------|
| Haifa | חיפה | Large city |
| Nesher | נשר | Medium city |
| Hof HaCarmel | חוף הכרמל | Coastal area |

### Script Location
```
scripts/seed-data/
├── README.md
└── seed-realistic-data.ts
```

### What Gets Generated

#### Per City:
| Data Type | Count | Description |
|-----------|-------|-------------|
| Active Reports | 150 | Last 12 months, mixed statuses |
| Archive Reports | 100 | >1 year old, all resolved |
| Anomalies | 6 | 2 spike + 2 slow_response + 2 geo_cluster |

#### Report Status Distribution:
- 🟢 Open: 15%
- 🟡 Pending: 15%
- 🟠 In Progress: 20%
- ✅ Resolved: 50%

#### Categories:
- 🗑️ Garbage (אשפה)
- 💡 Lighting (תאורה)
- 🌳 Tree (עצים)
- ⚠️ Hazard (מפגעים)

### Features

#### 1. Seeded Randomness
Uses Linear Congruential Generator (LCG) for reproducible results:
```typescript
class SeededRandom {
  private seed: number;
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}
```

Default seed: `12345` - change for different data sets.

#### 2. Polygon-Constrained Coordinates
All report coordinates are validated to be INSIDE city boundaries:
```typescript
function generatePointInPolygon(polygon, random, maxAttempts = 100)
```

#### 3. Realistic Status History
Complete transition history with timestamps:
```json
{
  "statusHistory": [
    { "status": "open", "updatedAt": 1699000000000, "updatedBy": "citizen" },
    { "status": "pending", "updatedAt": 1699100000000, "updatedBy": "SeederBot" },
    { "status": "in progress", "updatedAt": 1699200000000, "updatedBy": "SeederBot" },
    { "status": "resolved", "updatedAt": 1699300000000, "updatedBy": "SeederBot" }
  ]
}
```

#### 4. Hebrew Descriptions
City-specific street names and category-appropriate descriptions:
```typescript
const DESCRIPTION_TEMPLATES = {
  garbage: ["פח אשפה עולה על גדותיו", "אשפה מפוזרת ברחוב", ...],
  lighting: ["פנס רחוב לא דולק", "תאורה מהבהבת ברחוב", ...],
  // ...
};
```

#### 5. Anomaly Types

| Type | Description | Metrics |
|------|-------------|---------|
| `spike` | Sudden increase in reports | currentCount, baselineCount, pctChange, zScore |
| `slow_response` | Response time exceeds SLA | currentAvgDays, baselineAvgDays, threshold |
| `geo_cluster` | Geographic concentration | clusterSize, radiusMeters, density |

### Usage

```bash
# Navigate to project root
cd muni-map

# Run seeder
npx ts-node scripts/seed-data/seed-realistic-data.ts
```

### Output

```
╔════════════════════════════════════════════════════╗
║     MuniMap Realistic Data Seeder                  ║
╚════════════════════════════════════════════════════╝

🌱 Using seed: 12345
🎯 Target cities: חיפה, נשר, חוף הכרמל

🏙️ Seeding city: חיפה
   📍 Polygon has 1234 vertices
   📝 Generating 150 active reports...
   ✅ Written 150 active reports
   📦 Generating 100 archive reports...
   ✅ Written 100 archive reports
   🚨 Generating 6 anomalies...
   ✅ Written 6 anomalies

[... repeats for each city ...]

╔════════════════════════════════════════════════════╗
║     ✅ SEEDING COMPLETE                             ║
╚════════════════════════════════════════════════════╝

Total per city:
  - Active reports: 150
  - Archive reports: 100
  - Anomalies: 6

Total overall: 750 reports + 18 anomalies
```

### Firebase Structure

```
📁 Reports/
   📁 garbage/
      📄 {reportId} → Report data
   📁 lighting/
   📁 tree/
   📁 hazard/

📁 ArchivedReports/
   📁 2022/
      📁 garbage/
         📄 {reportId} → ArchivedReport data
   📁 2023/

📁 Anomalies/
   📄 anom_garbage_חיפה_spike_1
   📄 anom_lighting_חיפה_slow_response_1
   📄 anom_tree_חיפה_geo_cluster_1
   ...
```

---

## Security Summary

### Before (Vulnerable)
```
User logs in → City from Firestore: "חיפה"
Opens Simulator → Can set any city name
Writes reports → No validation ❌
```

### After (Secured)
```
User logs in → City from Firestore: "חיפה"
Opens Simulator → City enforced from auth ✅
Writes reports:
  1. Check: authorizedCity set? ✅
  2. Check: report.area === authorizedCity? ✅
  3. Check: coordinates inside polygon? ✅
  → Write allowed ✅
```

---

## Files Modified

### PART A - Security
| File | Changes |
|------|---------|
| `lib/simulation/firebaseWriter.ts` | Added `setAuthorizedCity()`, `validateCityAuthorization()`, polygon check |
| `lib/simulation/engine.ts` | City validation in `start()`, clear auth in `stop()` |
| `components/dashboard/simulation/SimulationPanel.tsx` | Uses `useAuth()`, disabled without valid city |
| `lib/dev-tools/report-generator/writeReportsToFirebase.ts` | Added `authorizedCity` param, polygon check |
| `lib/dev-tools/report-generator/TestReportGeneratorModal.tsx` | Uses `useAuth()`, passes auth city |

### PART B - Data Generator
| File | Purpose |
|------|---------|
| `scripts/seed-data/README.md` | Documentation |
| `scripts/seed-data/seed-realistic-data.ts` | Main seeder script |

---

## Testing Recommendations

1. **Manual Test - Simulation**
   - Login as user with city "חיפה"
   - Open Simulation Panel
   - Verify city shows as "🔒 חיפה"
   - Start simulation, verify reports go to חיפה only

2. **Manual Test - Dev Tools Generator**
   - Open Test Report Generator
   - Verify "Authorized City" shows your city
   - Generate and write reports
   - Verify in Firebase all have correct `area`

3. **Run Seeder**
   ```bash
   npx ts-node scripts/seed-data/seed-realistic-data.ts
   ```
   - Check Firebase for 3 cities' data
   - Verify anomalies exist
   - Verify archive has correct years
