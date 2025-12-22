# Spatial Anomaly Detection - Visual Guide

## 🗺️ Algorithm Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INPUT: MUNICIPAL REPORTS                         │
│  [lat, lng, type, area, timestamp, deleted, ...]                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PHASE 1: SPATIAL PARTITIONING                          │
│                                                                     │
│  City divided into 500m × 500m grid cells:                         │
│                                                                     │
│     ┌───────┬───────┬───────┬───────┐                             │
│     │  C1   │  C2   │  C3   │  C4   │  Each cell = 0.005°        │
│     │ 2 rpt │ 15rpt │ 3 rpt │ 1 rpt │                             │
│     ├───────┼───────┼───────┼───────┤                             │
│     │  C5   │  C6   │  C7   │  C8   │  Reports assigned          │
│     │ 1 rpt │ 12rpt │ 0 rpt │ 2 rpt │  by coordinates            │
│     ├───────┼───────┼───────┼───────┤                             │
│     │  C9   │  C10  │  C11  │  C12  │                             │
│     │ 0 rpt │ 4 rpt │ 18rpt │ 1 rpt │                             │
│     └───────┴───────┴───────┴───────┘                             │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│           PHASE 2: TEMPORAL BINNING (PER CELL)                     │
│                                                                     │
│  Build 6-month history for each cell:                              │
│                                                                     │
│  Cell C2 (15 current reports):                                     │
│                                                                     │
│    Month:  -5    -4    -3    -2    -1   Now                       │
│    Count:   2     3     2     3     2    15  ← SPIKE!             │
│            └──── Baseline μ=2.4 ────┘                             │
│                                                                     │
│  Cell C11 (18 current reports):                                    │
│                                                                     │
│    Month:  -5    -4    -3    -2    -1   Now                       │
│    Count:   3     4     2     3     4    18  ← SPIKE!             │
│            └──── Baseline μ=3.2 ────┘                             │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│           PHASE 3: ANOMALY SCORING                                 │
│                                                                     │
│  For each cell, calculate:                                         │
│                                                                     │
│    threshold = max(μ + 2σ, μ×1.3, μ+5, 7)                         │
│                                                                     │
│  Cell C2:  current=15, μ=2.4, σ=0.5                               │
│            threshold = max(3.4, 3.1, 7.4, 7) = 7.4                │
│            15 > 7.4 → ✅ ANOMALOUS                                 │
│            Z-score = (15-2.4)/0.5 = 25.2                          │
│            Severity = HIGH (Z>3)                                   │
│                                                                     │
│  Cell C11: current=18, μ=3.2, σ=0.8                               │
│            threshold = max(4.8, 4.2, 8.2, 7) = 8.2                │
│            18 > 8.2 → ✅ ANOMALOUS                                 │
│            Z-score = (18-3.2)/0.8 = 18.5                          │
│            Severity = HIGH                                         │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│        PHASE 4: SPATIAL CONSISTENCY VALIDATION                     │
│                                                                     │
│  Check if anomalous cells have elevated neighbors:                 │
│                                                                     │
│  Cell C2 (anomalous):                                              │
│                                                                     │
│     ┌────┬────┬────┐                                              │
│     │ C1 │[C2]│ C3 │    Neighbors: C1(2), C3(3), C6(12)          │
│     ├────┼────┼────┤                                              │
│     │    │ C6 │    │    C6 is elevated (12 >> baseline)          │
│     └────┴────┴────┘    → ✅ SPATIALLY CONSISTENT                 │
│                                                                     │
│  Cell C11 (anomalous):                                             │
│                                                                     │
│     ┌────┬────┬────┐                                              │
│     │ C7 │    │    │    Neighbors: C7(0), C10(4), C12(1)         │
│     ├────┼────┼────┤                                              │
│     │C10 │[C11]C12│    C10 shows some activity                    │
│     └────┴────┴────┘    → ✅ SPATIALLY CONSISTENT                 │
│                                                                     │
│  Isolated spike (would be rejected):                               │
│                                                                     │
│     ┌────┬────┬────┐                                              │
│     │ 0  │ 0  │ 0  │    All neighbors have zero activity          │
│     ├────┼────┼────┤                                              │
│     │ 0  │[20]│ 0  │    → ❌ ISOLATED NOISE (filtered out)        │
│     ├────┼────┼────┤                                              │
│     │ 0  │ 0  │ 0  │                                              │
│     └────┴────┴────┘                                              │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│         PHASE 5: CLUSTER FORMATION (DFS)                           │
│                                                                     │
│  Merge adjacent anomalous cells:                                   │
│                                                                     │
│  Before:                      After:                               │
│  ┌───┬───┬───┬───┐           ┌───┬───┬───┬───┐                   │
│  │   │ A │   │   │           │   │╔═══════╗ │                    │
│  ├───┼───┼───┼───┤           ├───┼║CLUSTER║─┤                    │
│  │   │ A │   │   │    →      │   │║   1   ║ │                    │
│  ├───┼───┼───┼───┤           ├───┼║───────║─┤                    │
│  │   │   │   │   │           │   │║   │   ║ │                    │
│  ├───┼───┼───┼───┤           ├───┼╚═══════╝─┤                    │
│  │   │ B │ B │   │           │   │╔═══╗╔═══╗│                    │
│  └───┴───┴───┴───┘           └───┴║ 2 ║║ 3 ║┘                    │
│                                    ╚═══╝╚═══╝                      │
│  A, B = anomalous cells                                            │
│                                                                     │
│  Depth-First Search connects adjacent cells:                       │
│    • Start at any unvisited anomalous cell                         │
│    • Recursively add all adjacent anomalous neighbors              │
│    • Result = one connected component (cluster)                    │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│          PHASE 6: ANOMALY OBJECT CONSTRUCTION                      │
│                                                                     │
│  For each cluster, calculate:                                      │
│                                                                     │
│  Centroid: (lat_avg, lng_avg) of all cells                        │
│  Radius: max distance from centroid to any cell                   │
│  Metrics: total reports, Z-scores, % change                       │
│  Severity: HIGH if majority cells are high severity               │
│                                                                     │
│  Example Output:                                                   │
│  ┌──────────────────────────────────────────────┐                │
│  │ Cluster #1                                    │                │
│  │ • Category: garbage                           │                │
│  │ • Area: Downtown                              │                │
│  │ • Centroid: (32.0851, 34.7806)               │                │
│  │ • Radius: 650m                                │                │
│  │ • Total Reports: 33                           │                │
│  │ • Cells Involved: 3                           │                │
│  │ • Max Z-Score: 25.2                           │                │
│  │ • % Change: +300%                             │                │
│  │ • Severity: HIGH                              │                │
│  └──────────────────────────────────────────────┘                │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OUTPUT: SPATIAL ANOMALIES                        │
│                                                                     │
│  Array of Anomaly objects sorted by severity/Z-score               │
│  Ready for map visualization and reporting                         │
│                                                                     │
│  Map Rendering:                                                    │
│  ┌──────────────────────────────────────────────┐                │
│  │          🗺️  City Map                        │                │
│  │                                               │                │
│  │    ⭕ (32.0851, 34.7806)                     │                │
│  │    │  Radius: 650m                           │                │
│  │    │  33 garbage reports                     │                │
│  │    └─ Severity: HIGH (red)                   │                │
│  │                                               │                │
│  │                  ⭕ (32.0705, 34.7701)       │                │
│  │                  │  Radius: 550m             │                │
│  │                  │  18 hazard reports        │                │
│  │                  └─ Severity: MEDIUM (orange)│                │
│  │                                               │                │
│  └──────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Decision Tree: When is a Cell Anomalous?

```
                        START
                          │
                          ▼
          ┌───────────────────────────────┐
          │ Does cell have ≥7 reports     │
          │ in current month?             │
          └───────────┬───────────────────┘
                      │
         NO ◄─────────┴────────► YES
          │                      │
          ▼                      ▼
    NOT ANOMALOUS    ┌──────────────────────────┐
                     │ Build 6-month history    │
                     │ Calculate baseline μ, σ  │
                     └───────────┬──────────────┘
                                 │
                                 ▼
                     ┌──────────────────────────┐
                     │ threshold = max(         │
                     │   μ + 2σ,                │
                     │   μ × 1.3,               │
                     │   μ + 5,                 │
                     │   7                      │
                     │ )                        │
                     └───────────┬──────────────┘
                                 │
                                 ▼
                     ┌──────────────────────────┐
                     │ current ≥ threshold?     │
                     └───────────┬──────────────┘
                                 │
                    NO ◄─────────┴────────► YES
                     │                      │
                     ▼                      ▼
               NOT ANOMALOUS    ┌──────────────────────────┐
                                │ Check neighbors:         │
                                │ ≥25% have elevated       │
                                │ activity (≥50% baseline)?│
                                └───────────┬──────────────┘
                                            │
                               NO ◄─────────┴────────► YES
                                │                      │
                                ▼                      ▼
                          NOT ANOMALOUS    ┌──────────────────┐
                          (isolated)       │ ANOMALOUS CELL   │
                                           │ Add to cluster   │
                                           └──────────────────┘
```

---

## 🎯 Example Scenario: Garbage Collection Strike

### Situation
A 3-day garbage collection strike causes reports to pile up in a specific neighborhood.

### Before Strike (Historical Pattern)
```
Week 1: 2 reports
Week 2: 3 reports
Week 3: 2 reports  
Week 4: 2 reports
────────────────────
Baseline: μ=2.25, σ=0.43
```

### During Strike (Current Month)
```
Day 1-3 (strike):  5 reports/day = 15 total
Day 4-30 (normal): 2 reports
────────────────────
Total: 17 reports (vs. expected ~2-3)
```

### Detection Process

**Step 1: Grid Assignment**
- All 17 reports fall within 2 adjacent grid cells (C5, C6)
- Cell C5: 9 reports
- Cell C6: 8 reports

**Step 2: Anomaly Scoring**
```
Cell C5:
  current = 9
  μ = 2.25, σ = 0.43
  threshold = max(3.11, 2.93, 7.25, 7) = 7.25
  9 > 7.25 → ANOMALOUS ✅
  Z-score = (9-2.25)/0.43 = 15.7
  Severity = HIGH (Z > 3)

Cell C6:
  Similar calculation → ANOMALOUS ✅
```

**Step 3: Spatial Consistency**
- C5 and C6 are neighbors
- Both show elevated activity
- Consistency = 100% → VALID ✅

**Step 4: Cluster Formation**
- C5 and C6 merged into one cluster
- Centroid: average of both cells
- Radius: ~450m (distance between cell centers)

**Step 5: Output**
```json
{
  "id": "anom_garbage_Downtown_geo_cluster",
  "type": "geo_cluster",
  "category": "garbage",
  "area": "Downtown",
  "severity": "high",
  "center": { "lat": 32.0850, "lng": 34.7805 },
  "metrics": {
    "totalReports": 17,
    "cellsInvolved": 2,
    "radiusMeters": 450,
    "maxZScore": 15.7,
    "pctChange": 655,
    "baselineMean": 2.25
  },
  "title": "ריכוז גיאוגרפי של דיווחי garbage באזור Downtown",
  "description": "זוהה ריכוז חריג של 17 דיווחים ברדיוס 450מ'..."
}
```

---

## 🔬 Threshold Calculation Deep Dive

### Why Hybrid Threshold?

| Scenario | Simple Z-score | Hybrid Approach | Winner |
|----------|----------------|-----------------|--------|
| 2 → 10 reports (low baseline) | Z=16 (too sensitive) | Uses percentage (400%) | ✅ Hybrid |
| 50 → 55 reports (high baseline) | Z=0.5 (miss) | Uses Z-score (passes) | ✅ Hybrid |
| 0 → 1 report (zero baseline) | Undefined (σ=0) | Uses absolute (+5 min) | ✅ Hybrid |
| 3 → 5 reports (noisy data) | Z=2.5 (false alarm) | Filtered (< 7 minimum) | ✅ Hybrid |

### Component Breakdown

1. **μ + 2σ** (Statistical Component)
   - Detects outliers in normal distributions
   - 2σ = 95% confidence interval
   - Good for: Stable, high-volume areas

2. **μ × 1.3** (Percentage Component)
   - 30% increase threshold
   - Good for: Low-baseline areas where absolute change is small
   - Example: 3 → 5 reports = 67% increase

3. **μ + 5** (Absolute Component)
   - Minimum 5-report increase
   - Good for: Preventing 1→2 false alarms
   - Grounds the threshold in practical terms

4. **7** (Minimum Count)
   - Must have at least 7 reports total
   - Good for: Filtering sparse, noisy data
   - Municipal context: <7 reports rarely actionable

### Visual Comparison

```
              Threshold Calculation Example
              
Scenario A: Low Baseline (μ=2, σ=1)
────────────────────────────────────────────
μ + 2σ    =  2 + 2(1)   =  4
μ × 1.3   =  2 × 1.3    =  2.6
μ + 5     =  2 + 5      =  7
7         =              7
────────────────────────────────────────────
threshold = max(4, 2.6, 7, 7) = 7  ← Minimum dominates

Scenario B: Medium Baseline (μ=10, σ=3)
────────────────────────────────────────────
μ + 2σ    = 10 + 2(3)   = 16
μ × 1.3   = 10 × 1.3    = 13
μ + 5     = 10 + 5      = 15
7         =               7
────────────────────────────────────────────
threshold = max(16, 13, 15, 7) = 16  ← Z-score dominates

Scenario C: High Baseline (μ=50, σ=5)
────────────────────────────────────────────
μ + 2σ    = 50 + 2(5)   = 60
μ × 1.3   = 50 × 1.3    = 65
μ + 5     = 50 + 5      = 55
7         =               7
────────────────────────────────────────────
threshold = max(60, 65, 55, 7) = 65  ← Percentage dominates
```

---

## 🧪 Why Spatial Consistency Matters

### Problem: False Positives from Data Errors

**Scenario**: GPS glitch records 20 reports at same coordinate

```
Without Spatial Validation:
┌────┬────┬────┐
│ 0  │ 0  │ 0  │
├────┼────┼────┤    Cell C5 = 20 reports
│ 0  │[20]│ 0  │    Baseline = 2
├────┼────┼────┤    Z-score = 36 (!!!!)
│ 0  │ 0  │ 0  │    → FALSE ALARM
└────┴────┴────┘

With Spatial Validation:
┌────┬────┬────┐
│ 0  │ 0  │ 0  │    Check neighbors: all zero
├────┼────┼────┤    No supporting evidence
│ 0  │[20]│ 0  │    Consistency = 0%
├────┼────┼────┤    → ❌ REJECTED
│ 0  │ 0  │ 0  │    
└────┴────┴────┘
```

### Real Spatial Anomaly Pattern

```
True Geographic Cluster:
┌────┬────┬────┐
│ 3  │ 5  │ 2  │    Multiple cells elevated
├────┼────┼────┤    Supporting pattern
│ 4  │[15]│ 6  │    Consistency = 83%
├────┼────┼────┤    → ✅ ACCEPTED
│ 1  │ 4  │ 2  │
└────┴────┴────┘
```

---

## 🎬 End-to-End Animation

```
TIME: Month -5
┌─────────────────────────┐
│    🗺️  City Grid        │
│  ┌───┬───┬───┬───┐      │
│  │ 2 │ 1 │ 3 │ 2 │      │  Normal activity
│  ├───┼───┼───┼───┤      │  across all cells
│  │ 1 │ 2 │ 2 │ 1 │      │
│  ├───┼───┼───┼───┤      │
│  │ 3 │ 2 │ 1 │ 2 │      │
│  └───┴───┴───┴───┘      │
└─────────────────────────┘

TIME: Month -4, -3, -2, -1
┌─────────────────────────┐
│  Similar patterns       │
│  Building baseline...   │
│  μ ≈ 2.0, σ ≈ 0.7       │
└─────────────────────────┘

TIME: Current Month (PROBLEM EMERGES)
┌─────────────────────────┐
│    🗺️  City Grid        │
│  ┌───┬───┬───┬───┐      │
│  │ 2 │ 1 │🔥│🔥│ 3 │      │  ← Spike in NE corner
│  ├───┼───┼───┼───┤      │
│  │ 1 │ 2 │🔥│🔥│ 2 │      │  🔥 = 15-20 reports
│  ├───┼───┼───┼───┤      │
│  │ 2 │ 3 │ 2 │ 1 │      │
│  └───┴───┴───┴───┘      │
└─────────────────────────┘

DETECTION TRIGGERED
┌─────────────────────────┐
│  Anomalous Cells:       │
│  • (0,2) → (0,3)        │
│  • (1,2) → (1,3)        │
│                         │
│  All exceed threshold   │
│  All spatially adjacent │
│  → FORM CLUSTER         │
└─────────────────────────┘

FINAL OUTPUT
┌─────────────────────────┐
│    🗺️  Alert Map        │
│  ┌───┬───┬───┬───┐      │
│  │   │   │╔═══╗│   │      │
│  ├───┼───┼║ ⭕ ║┼───┤      │  Red circle = anomaly
│  │   │   │║   ║│   │      │  radius ~650m
│  ├───┼───┼╚═══╝┼───┤      │  33 total reports
│  │   │   │   │   │      │
│  └───┴───┴───┴───┘      │
└─────────────────────────┘
```

---

**For implementation details, see `detectSpatialClusters.ts`**

**For algorithm justification, see `SPATIAL_ANOMALY_DETECTION_DESIGN.md`**
