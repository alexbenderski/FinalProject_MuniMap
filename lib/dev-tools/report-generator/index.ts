/**
 * Test Report Generator - Module Entry Point
 * 
 * This module provides a test-only report generator for QA purposes.
 * 
 * === REMOVAL INSTRUCTIONS ===
 * To completely remove this feature:
 * 1. Delete the entire /lib/dev-tools/report-generator folder
 * 2. Remove the import from dashboard/page.tsx
 * 3. Remove the button and modal JSX from dashboard/page.tsx
 * 
 * No other files need to be modified.
 * ===========================
 */

export { default as TestReportGeneratorModal } from "./TestReportGeneratorModal";
export {
  generateReports,
  validateConfig,
  STATUS_OPTIONS,
  type GeneratorConfig,
  type StatusTimeRange,
  type EndStatus,
  type GeneratedReport,
  type ValidationResult,
} from "./generateReports";
export {
  writeReportsToFirebase,
  writeReportsInBatches,
  type WriteResult,
} from "./writeReportsToFirebase";
