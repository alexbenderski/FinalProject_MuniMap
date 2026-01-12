# Realistic Data Seeder for MuniMap

## Overview
This script generates realistic municipal report data for testing and demonstration purposes.

**Target Cities:**
1. חיפה (Haifa)
2. נשר (Nesher)  
3. חוף הכרמל (Hof HaCarmel)

## What Gets Generated

### Per City:
- **12 months** of report data with realistic status transitions
- **Archive data** (reports > 1 year old, all resolved)
- **6 anomalies** per city:
  - 2 × Spike anomalies
  - 2 × Slow Resolution anomalies  
  - 2 × Spatial Cluster (geo_cluster) anomalies

### Report Distribution:
- All 4 categories: garbage, lighting, tree, hazard
- Status distribution: open (15%), pending (15%), in progress (20%), resolved (50%)
- Realistic SLA-based age distribution for active reports
- Complete status history with timestamps

## Security Notes

⚠️ **This is an ADMIN-ONLY script** for initial data seeding.
- Does NOT use the live simulation writer (which is city-locked)
- Uses Firebase Admin SDK directly
- Validates coordinates against city polygons before writing
- Only seeds the specified 3 cities

## Usage

```bash
# From project root
npx ts-node scripts/seed-data/seed-realistic-data.ts
```

## Output Structure

### Reports: `Reports/{category}/{id}`
```json
{
  "area": "חיפה",
  "description": "פח אשפה עולה על גדותיו",
  "lat": 32.7940,
  "lng": 34.9896,
  "status": "open",
  "timestamp": 1699000000000,
  "type": "garbage",
  "statusHistory": [...]
}
```

### Archived Reports: `ArchivedReports/{year}/{category}/{id}`
```json
{
  "area": "חיפה",
  "status": "resolved",
  "resolvedAt": 1668000000000,
  "archivedYear": 2023,
  ...
}
```

### Anomalies: `Anomalies/{id}`
```json
{
  "id": "anom_garbage_חיפה_spike",
  "type": "spike",
  "category": "garbage",
  "area": "חיפה",
  "severity": "high",
  "status": "open",
  ...
}
```

## Seed Reproducibility

Uses seeded random number generator for deterministic output.
Default seed: `12345`

Change seed in the script for different data sets.
