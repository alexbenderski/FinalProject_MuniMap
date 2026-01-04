# 🧪 Report Simulation Server - User Guide

## Overview

The **Report Simulation Server** is a comprehensive testing tool that generates realistic municipal reports and writes them directly to your Firebase Realtime Database. It's designed for QA testing, load testing, and validating anomaly detection algorithms.

---

## 🚀 Quick Start

### Access the Simulator

1. **Login** to the dashboard
2. Click the **🧪 Simulation** button in the top bar (purple button)
3. The Simulation Panel will open

### Using Presets

The easiest way to start is by using pre-configured presets:

1. Click the **"Presets"** tab (default)
2. Choose a preset:
   - **🎲 Random Traffic (Light)**: 3 reports/minute for 5 minutes
   - **🎲 Random Traffic (Heavy)**: 20 reports/minute for 10 minutes
   - **💥 Burst Traffic**: Sudden spikes every 30 seconds
   - **🗑️ Garbage Heavy**: 70% garbage reports
   - **💡 Lighting Heavy**: 60% lighting reports
   - **⚠️ Hazard Crisis**: High hazard reports (disaster scenario)
   - **🌅 Realistic Day Pattern**: Time-based pattern
   - **✅ With Resolved Reports**: Includes resolved status
   - **🔥 Stress Test**: Maximum load (60/min for 30 minutes)
   - **⚡ Quick Test**: Fast test (10 reports in 30 seconds)

3. Click **"Start Simulation"**

---

## ⚙️ Custom Configuration

### Custom Settings Tab

Customize your simulation by clicking the **"Custom Settings"** tab:

#### 1. Generation Mode
- **🎲 Random**: Equal distribution across all categories
- **⚙️ Controlled**: Specific category weights (coming soon)
- **💥 Burst**: Sudden traffic spikes
- **📊 Pattern**: Time-based patterns (coming soon)

#### 2. Simulation Duration
- Set the value (number)
- Choose unit: Seconds, Minutes, or Hours
- Example: `10 minutes`, `1 hour`

#### 3. Reports per Minute
- Slider from 1 to 100 reports/minute
- Use lower values (1-5) for realistic traffic
- Use higher values (50-100) for stress testing

#### 4. Categories
Toggle which categories to include:
- 🗑️ **Garbage** (אשפה)
- 💡 **Lighting** (תאורה)
- 🌳 **Trees** (עצים)
- ⚠️ **Hazards** (מפגעים)

Must select at least one category.

#### 5. Include Resolved Reports
- **OFF**: All reports are "open" (default)
- **ON**: Mix of open/pending/in-progress/resolved statuses
  - 40% open
  - 25% pending
  - 20% in progress
  - 15% resolved
  - Average resolution time: 3 days

---

## 📊 Monitor Tab

The **Monitor** tab shows real-time statistics during simulation:

### Progress Bar
- Shows elapsed time vs. total duration
- Displays time remaining

### Statistics Grid
- **Generated**: Total reports created
- **Written**: Successfully written to Firebase
- **Failed**: Write failures (errors)
- **Rate**: Reports per minute (current throughput)

### Category Breakdown
Shows how many reports were generated per category:
- 🗑️ Garbage
- 💡 Lighting
- 🌳 Trees
- ⚠️ Hazards

### Activity Log
Real-time log of simulation events:
- Batch generations
- Write operations
- Errors (shown in red)
- Completion messages

---

## 🎮 Controls

### Start Simulation
- Available when **idle** or **completed**
- Must have at least one category selected
- Starts generating and writing reports

### Pause
- Available when **running**
- Temporarily stops generation
- Preserves current progress

### Resume
- Available when **paused**
- Continues from where it paused

### Stop
- Available when **running** or **paused**
- Immediately terminates simulation
- Cannot be resumed (must start new simulation)

---

## 🏗️ Architecture

### Core Components

1. **SimulationEngine** (`lib/simulation/engine.ts`)
   - Orchestrates the entire simulation
   - Manages state transitions (idle → running → paused → completed)
   - Emits events for UI updates

2. **SimulationGenerator** (`lib/simulation/generator.ts`)
   - Generates realistic Hebrew report descriptions
   - Creates random locations within city boundaries
   - Uses seeded random for reproducible runs
   - Supports all 4 report categories

3. **SimulationFirebaseWriter** (`lib/simulation/firebaseWriter.ts`)
   - Writes reports to Firebase Realtime Database
   - Batch processing for efficiency
   - Error handling and retry logic

4. **SimulationPanel** (`components/dashboard/simulation/SimulationPanel.tsx`)
   - User interface component
   - Real-time statistics display
   - Multi-language support (English/Hebrew)

### Data Flow

```
User Selects Config
     ↓
SimulationEngine.start()
     ↓
Loop: Generate Batch
     ↓
SimulationGenerator.generateBatch()
     ↓
SimulationFirebaseWriter.writeReports()
     ↓
Update Stats & Emit Events
     ↓
UI Reacts to Events
     ↓
Repeat until Duration Elapsed
```

---

## 📝 Generated Report Structure

Each simulated report includes:

```typescript
{
  id: string,              // Temporary ID (Firebase generates real one)
  type: ReportCategory,    // garbage | lighting | tree | hazard
  city: string,            // City name (e.g., "Tel Aviv")
  location: string,        // Address in city
  coordinates: {
    lat: number,
    lng: number
  },
  description: string,     // Hebrew description
  status: string,          // open | pending | in progress | resolved
  createdAt: number,       // Unix timestamp (milliseconds)
  updatedAt: number,       // Unix timestamp (milliseconds)
  hasImage: boolean,       // Always false for simulated reports
  imageUrl?: string,       // Not included
  userName?: string,       // Not included
  phone?: string,          // Not included
  criticality?: string     // Not included (calculated by system)
}
```

---

## 🎯 Use Cases

### 1. Anomaly Detection Testing
**Goal**: Trigger spike anomalies to verify detection

**Setup**:
- Preset: **Burst Traffic**
- Duration: 5-10 minutes
- Reports/min: 30+

**Expected Result**: Anomaly detector should flag spike in reports

---

### 2. Load Testing
**Goal**: Test system performance under heavy load

**Setup**:
- Preset: **Stress Test**
- Duration: 30 minutes
- Reports/min: 60

**Expected Result**: System remains responsive, no crashes

---

### 3. Slow Response Testing
**Goal**: Test slow resolution time anomaly

**Setup**:
1. Use **With Resolved Reports** preset
2. Wait for reports to age
3. Use Anomaly Threshold Calculator to verify detection

**Note**: Slow response requires time passage - consider using Anomaly Calculator's manual mode to inject older reports.

---

### 4. Category Skew Testing
**Goal**: Test category-specific anomalies

**Setup**:
- Preset: **Garbage Heavy** or **Lighting Heavy**
- Duration: 10 minutes
- Verify one category dominates

**Expected Result**: System shows category imbalance in statistics

---

### 5. Realistic Traffic Pattern
**Goal**: Simulate normal day-to-day operations

**Setup**:
- Preset: **Realistic Day Pattern**
- Duration: 1 hour
- Reports/min: 5

**Expected Result**: Natural fluctuation in report volume

---

## 🔧 Technical Details

### Seeded Random Number Generator
The generator uses a **seeded RNG** for reproducibility:
- Same seed = same sequence of reports
- Useful for debugging and comparing runs
- Seed is based on current timestamp by default

### Location Generation
Reports are generated **within city boundaries**:
- Uses polygon boundary data from `cities_municipal_boundaries.json`
- Point-in-polygon algorithm ensures valid locations
- Falls back to random coordinates if no boundary defined

### Hebrew Descriptions
Realistic Hebrew descriptions based on category:

**Garbage**:
- "פח אשפה מלא ללא פינוי" (Full garbage bin without collection)
- "ערמת פסולת בפארק" (Pile of waste in park)

**Lighting**:
- "פנס רחוב כבוי" (Street light off)
- "תאורה לא תקינה ברחוב" (Faulty lighting on street)

**Tree**:
- "עץ מסוכן בצד הכביש" (Dangerous tree at roadside)
- "ענפים תלויים מעל הכביש" (Branches hanging over road)

**Hazard**:
- "בור גדול בכביש" (Large pothole in road)
- "מדרכה שבורה ומסוכנת" (Broken and dangerous sidewalk)

### Status Distribution (Resolved Mode)
When "Include Resolved Reports" is enabled:
- 40% open
- 25% pending
- 20% in-progress
- 15% resolved

Resolved reports have:
- `resolvedAt` timestamp set
- Creation date adjusted backwards by average resolution time

---

## 🐛 Troubleshooting

### "No categories selected"
**Problem**: Start button disabled
**Solution**: Select at least one category in Custom Settings

### "Simulation failed to start"
**Problem**: Firebase connection issue
**Solution**: Check Firebase configuration and internet connection

### Reports not appearing in dashboard
**Problem**: Reports written but not visible
**Solution**: 
1. Refresh the dashboard
2. Check if filters are excluding simulated reports
3. Verify correct city is selected

### High failure rate in Monitor tab
**Problem**: Many reports failing to write
**Solution**:
1. Check Firebase Realtime Database rules
2. Verify network connection
3. Reduce reports/minute rate

---

## 🌐 Multi-Language Support

The Simulation Panel supports:
- **English** (default)
- **עברית** (Hebrew)

Language auto-switches based on user's dashboard language preference.

---

## 🔐 Security Considerations

- Simulated reports are **real data** written to Firebase
- They are **indistinguishable** from user-submitted reports
- Use simulation only in **test/staging environments**
- Or use specific date ranges to filter out simulated data
- Consider adding a `isSimulated: true` flag if needed

---

## 📚 API Reference

### SimulationConfig Interface

```typescript
interface SimulationConfig {
  mode: "random" | "controlled" | "burst" | "pattern";
  duration: {
    value: number;
    unit: "seconds" | "minutes" | "hours";
  };
  reportsPerMinute: number;
  categories: ReportCategory[];
  cityName: string;
  cityBoundary?: number[][];
  useRandomLocations: boolean;
  includeResolvedReports: boolean;
  avgResolutionDays?: number;
  statusDistribution?: {
    open: number;
    pending: number;
    inProgress: number;
    resolved: number;
  };
  burstConfig?: {
    burstSize: number;
    burstInterval: number;
    burstDuration: number;
  };
  patternConfig?: {
    hourlyMultipliers: number[];
  };
  categoryWeights?: CategoryWeight[];
}
```

### SimulationEngine Events

```typescript
engine.on("stateChange", (state: SimulationState) => {
  // Called when state changes: idle → running → paused → completed
});

engine.on("statsUpdate", (stats: SimulationStats) => {
  // Called periodically with updated statistics
});

engine.on("log", (message: string) => {
  // Activity log messages
});

engine.on("error", (error: Error) => {
  // Error events
});

engine.on("completed", () => {
  // Simulation finished successfully
});
```

---

## 🎨 UI Components

### Preset Cards
- Visual preset selection
- Shows description and key parameters
- Highlights selected preset (purple border)

### Statistics Display
- Real-time progress bar
- Grid of key metrics
- Category breakdown chart
- Activity log with timestamps

### Status Indicator
- 🟢 Green (running): Simulation active
- 🟡 Yellow (paused): Temporarily stopped
- 🔵 Blue (completed): Finished successfully
- ⚪ Gray (idle): Not running

---

## 💡 Best Practices

1. **Start Small**: Use Quick Test preset first
2. **Monitor Performance**: Watch the Monitor tab during simulation
3. **Test Incrementally**: Increase load gradually
4. **Clear Old Data**: Clean up test data periodically
5. **Use Presets**: Start with presets before custom configs
6. **Check Firebase**: Verify reports appear in database
7. **Stop When Done**: Always stop simulation when finished
8. **Note Timestamps**: Remember when you ran simulations for analysis

---

## 🔮 Future Enhancements

Planned features:
- **Controlled Mode**: Precise category weights
- **Pattern Mode**: Time-of-day traffic patterns
- **Geographic Clustering**: Reports clustered in specific areas
- **User Simulation**: Include realistic user names/phones
- **Image Upload**: Generate/attach placeholder images
- **Custom Date Ranges**: Backfill historical data
- **Export Reports**: Save generated reports to JSON
- **Replay Scenarios**: Re-run saved simulation configs

---

## 📞 Support

For issues or questions:
- Check the Activity Log for error messages
- Review Firebase Realtime Database rules
- Verify city boundary data exists
- Contact system administrator

---

## 🎓 Examples

### Example 1: Trigger Spike Anomaly

```
Preset: Burst Traffic
Duration: 5 minutes
Expected: ~150 reports in bursts
Result: Spike anomaly detected
```

### Example 2: Load Test

```
Preset: Stress Test
Duration: 30 minutes
Expected: ~1800 reports total
Result: System stable under load
```

### Example 3: Category Analysis

```
Preset: Garbage Heavy
Duration: 10 minutes
Expected: 70% garbage, 30% other
Result: Category distribution validated
```

---

**Version**: 1.0  
**Last Updated**: January 2026  
**Status**: Production Ready ✅
