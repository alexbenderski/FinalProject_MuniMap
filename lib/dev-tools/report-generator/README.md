# Test Report Generator

A QA/testing-only tool for generating and inserting mock reports into Firebase.

## Purpose

This tool allows testers to quickly generate realistic test reports with:
- Configurable time ranges
- Status progression (open → pending → in progress → resolved)
- Geographic clustering within city boundaries
- All required fields populated with randomized but valid data

## Usage

1. Click the "🧪 Generate Test Reports" button in the bottom-left corner of the dashboard
2. Configure the test parameters:
   - **Time Range**: Start and end dates/times for report timestamps
   - **End Status**: The final status each report should reach
   - **Report Type**: Category (garbage, lighting, tree, etc.)
   - **Cluster Center**: Lat/lng coordinates for the center of the report cluster
   - **Radius**: Maximum distance from center (in meters)
   - **Count**: Number of reports to generate (1-100)
3. Click "Generate Preview" to see the reports before writing
4. Review the generated reports
5. Click "Write to Firebase" to insert them into the database

## Generated Report IDs

All generated reports have IDs prefixed with `test_` for easy identification and cleanup:
```
test_1735123456789_abc123def
```

## Status Progression Rules

Status progression is strictly linear:
- `open` → Only has `openAt` timestamp
- `pending` → Has `openAt` + `pendingAt`
- `in progress` → Has `openAt` + `pendingAt` + `inProgressAt`
- `resolved` → Has all timestamps including `resolvedAt`

Timestamps are automatically validated to ensure they progress forward in time.

## File Structure

```
lib/dev-tools/report-generator/
├── index.ts                      # Module entry point
├── generateReports.ts            # Pure generation logic (no side effects)
├── writeReportsToFirebase.ts     # Firebase write operations
├── TestReportGeneratorModal.tsx  # UI component
└── README.md                     # This file
```

## Removal Instructions

To completely remove this feature from the codebase:

### Step 1: Delete the folder
```bash
rm -rf lib/dev-tools/report-generator
```

### Step 2: Remove from dashboard/page.tsx

Remove this import:
```tsx
// 🧪 DEV TOOLS - Remove this import to disable test report generator
import { TestReportGeneratorModal } from "@/lib/dev-tools/report-generator";
```

Remove the state variables:
```tsx
// 🧪 DEV TOOLS - Test Report Generator state
const [testGenOpen, setTestGenOpen] = useState(false);
const [cityBoundary, setCityBoundary] = useState<{ lat: number; lng: number }[]>([]);
const [cityCenter, setCityCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
```

Remove the useEffect for loading city boundary:
```tsx
// 🧪 DEV TOOLS - Load city boundary for test generator
useEffect(() => { ... }, [loading, permissions]);
```

Remove the button:
```tsx
{/* 🧪 DEV TOOLS - Test Report Generator Button */}
<button onClick={() => setTestGenOpen(true)} ...>
  🧪 Generate Test Reports
</button>
```

Remove the modal:
```tsx
{/* 🧪 DEV TOOLS - Test Report Generator Modal */}
<TestReportGeneratorModal ... />
```

That's it! No other files need to be modified.

## Technical Notes

- Uses the existing `Report` type from `@/lib/types`
- Matches the Firebase structure exactly: `Reports/{type}/{id}`
- All generation logic is pure (no side effects)
- Firebase writes are isolated to a single module
- No modifications to production services or Firebase logic
- No global flags or environment variables
