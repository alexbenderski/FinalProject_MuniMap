# Anomaly Threshold Calculator

A QA/testing tool for understanding anomaly detection thresholds before generating test data.

## Purpose

This tool helps testers:
- Understand how many reports are needed to trigger each anomaly type
- See the statistical calculations behind threshold detection
- Plan test data generation to create specific anomaly scenarios

## Anomaly Types Supported

### 1. **Spike (High Activity)**
- **Detection Logic**: `detectHighActivity.ts`
- **Trigger**: Current month report count exceeds dynamic threshold
- **Formula**: `threshold = max(μ + 2σ, μ × 1.3, μ + 5, 7)`
  - μ = baseline mean (last 5 months)
  - σ = baseline standard deviation
  - Minimum 7 reports to trigger

### 2. **Slow Response**
- **Detection Logic**: `detectSlowResolution.ts`
- **Trigger**: Average resolution time exceeds dynamic threshold
- **Formula**: Same as spike, but applied to average days (not count)
- **Note**: Requires reports to be resolved to calculate

### 3. **Geographic Cluster**
- **Detection Logic**: `detectSpatialClusters.ts`
- **Trigger**: ≥5 reports in a ~300m × 300m grid cell
- **Additional Requirements**:
  - Cell must show increase vs its own history
  - At least 15% of neighboring cells must also show elevated activity

## Usage

1. Click "🎯 Anomaly Calculator" button in the dashboard
2. Enter historical data:
   - **Monthly Report Counts**: Last 6 months (oldest → newest)
   - **Average Resolution Days**: Last 6 months
3. Click "Recalculate Thresholds"
4. View results for each anomaly type

## Example Workflow

### Scenario: Trigger a Spike Anomaly

1. **Check Current State**:
   - Historical counts: [15, 18, 20, 17, 19, 22]
   - Current month (last value): 22

2. **Calculate Threshold**:
   - Baseline mean: 17.8
   - Baseline std: 1.92
   - Threshold = max(17.8 + 2×1.92, 17.8×1.3, 17.8+5, 7) = **23.14**

3. **Generate Test Data**:
   - Need 24 reports this month to trigger
   - Currently have 22, need **2 more**
   - Use Test Report Generator to add 2+ reports with current month dates

### Scenario: Trigger Slow Response

1. **Check Current State**:
   - Historical avg days: [5.2, 6.1, 5.8, 6.3, 5.5, 7.2]
   - Current month: 7.2 days

2. **Calculate Threshold**:
   - Baseline mean: 5.78 days
   - Baseline std: 0.43 days
   - Threshold = **7.64 days**

3. **Generate Test Data**:
   - Generate reports that take 8+ days to resolve
   - Use Test Report Generator with time ranges:
     - Open: Dec 1 → Dec 2
     - Resolved: Dec 9 → Dec 10 (8+ days later)

## Integration with Test Report Generator

The calculator works hand-in-hand with the Test Report Generator:

1. Use **Calculator** to determine thresholds
2. Use **Generator** to create reports that meet those thresholds
3. Verify anomalies appear in the system

## Statistical Details Displayed

For each anomaly type:
- **Current Value**: Current month count or avg days
- **Threshold**: Minimum value to trigger anomaly
- **Reports Needed**: How many more reports required
- **Baseline Mean**: Historical average (last 5 months)
- **Baseline Std**: Historical standard deviation
- **Target Z-Score**: Statistical significance level
- **Target % Increase**: Percentage above baseline

## Removal Instructions

To remove this feature:

1. Delete `/lib/dev-tools/anomaly-threshold-calculator` folder
2. Remove from `dashboard/page.tsx`:
   ```tsx
   // Remove import
   import { AnomalyThresholdCalculatorModal } from "@/lib/dev-tools/anomaly-threshold-calculator";
   
   // Remove state
   const [thresholdCalcOpen, setThresholdCalcOpen] = useState(false);
   
   // Remove button
   <button onClick={() => setThresholdCalcOpen(true)} ...>
     🎯 Anomaly Calculator
   </button>
   
   // Remove modal
   <AnomalyThresholdCalculatorModal ... />
   ```

## Technical Notes

- Uses the exact same formulas as production anomaly detection
- Calculations are client-side (no server calls needed)
- Default data is pre-populated with realistic values
- All three anomaly types use the same `calcDynamicThreshold` function
