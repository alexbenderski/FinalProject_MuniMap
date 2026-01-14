/**
 * Test Report Generator - Firebase Write Module
 * 
 * This module handles writing generated test reports to Firebase.
 * It is completely isolated from production Firebase logic.
 * 
 * To remove this feature:
 * 1. Delete the /lib/dev-tools/report-generator folder
 * 2. Remove the import and button from dashboard/page.tsx
 */

import { getDatabase, ref, set } from "firebase/database";
import { app } from "@/lib/client/firebase";
import { GeneratedReport } from "./generateReports";

export interface WriteResult {
  success: boolean;
  writtenCount: number;
  failedCount: number;
  errors: string[];
  writtenIds: string[];
}

/**
 * Write generated test reports to Firebase Realtime Database
 * 
 * New Structure: Reports/ActiveReports/{city}/{type}/{id} -> report data
 * 
 * @param reports - Reports to write
 */
export async function writeReportsToFirebase(
  reports: GeneratedReport[]
): Promise<WriteResult> {
  const result: WriteResult = {
    success: false,
    writtenCount: 0,
    failedCount: 0,
    errors: [],
    writtenIds: [],
  };

  if (reports.length === 0) {
    result.errors.push("No reports to write");
    return result;
  }

  const db = getDatabase(app);

  for (const report of reports) {
    try {
      const { generatedId, ...reportData } = report;
      const reportType = report.type;
      const city = report.area;
      
      if (!reportType) {
        result.errors.push(`Report ${generatedId}: Missing report type`);
        result.failedCount++;
        continue;
      }

      if (!city) {
        result.errors.push(`Report ${generatedId}: Missing city (area)`);
        result.failedCount++;
        continue;
      }

      // Write to: Reports/ActiveReports/{city}/{type}/{id}
      const reportRef = ref(db, `Reports/ActiveReports/${city}/${reportType}/${generatedId}`);
      
      await set(reportRef, reportData);

      result.writtenCount++;
      result.writtenIds.push(generatedId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Report ${report.generatedId}: ${errorMessage}`);
      result.failedCount++;
    }
  }

  result.success = result.failedCount === 0 && result.writtenCount > 0;
  return result;
}

/**
 * Batch write reports in chunks for better performance
 * 
 * @param reports - Reports to write
 * @param batchSize - Number of reports per batch
 */
export async function writeReportsInBatches(
  reports: GeneratedReport[],
  batchSize: number = 10
): Promise<WriteResult> {
  const result: WriteResult = {
    success: false,
    writtenCount: 0,
    failedCount: 0,
    errors: [],
    writtenIds: [],
  };

  const batches: GeneratedReport[][] = [];
  for (let i = 0; i < reports.length; i += batchSize) {
    batches.push(reports.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const batchResult = await writeReportsToFirebase(batch);
    result.writtenCount += batchResult.writtenCount;
    result.failedCount += batchResult.failedCount;
    result.errors.push(...batchResult.errors);
    result.writtenIds.push(...batchResult.writtenIds);
  }

  result.success = result.failedCount === 0 && result.writtenCount > 0;
  return result;
}
