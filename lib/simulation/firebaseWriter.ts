/**
 * Firebase Writer for Simulation
 * Writes generated reports to Firebase Realtime Database
 */

import { ref, set, push } from "firebase/database";
import { db } from "@/lib/client/firebase";
import { GeneratedReport } from "./types";

export interface WriteResult {
  success: boolean;
  writtenCount: number;
  errors: string[];
}

export class SimulationFirebaseWriter {
  private batchSize: number;

  constructor(batchSize: number = 10) {
    this.batchSize = batchSize;
  }

  /**
   * Write a single report to Firebase
   */
  async writeReport(report: GeneratedReport): Promise<WriteResult> {
    try {
      const reportsRef = ref(db, `Reports/${report.type}`);
      const newReportRef = push(reportsRef);
      
      // Remove id from the report data (Firebase generates its own)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...reportData } = report;
      
      await set(newReportRef, reportData);
      
      return { success: true, writtenCount: 1, errors: [] };
    } catch (error) {
      return {
        success: false,
        writtenCount: 0,
        errors: [`Failed to write report: ${error}`],
      };
    }
  }

  /**
   * Write multiple reports to Firebase
   */
  async writeReports(reports: GeneratedReport[]): Promise<WriteResult> {
    let writtenCount = 0;
    const errors: string[] = [];

    // Process in batches to avoid overwhelming Firebase
    for (let i = 0; i < reports.length; i += this.batchSize) {
      const batch = reports.slice(i, i + this.batchSize);
      
      const results = await Promise.allSettled(
        batch.map(report => this.writeReport(report))
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.success) {
          writtenCount += result.value.writtenCount;
        } else if (result.status === "rejected") {
          errors.push(String(result.reason));
        } else if (result.status === "fulfilled" && !result.value.success) {
          errors.push(...result.value.errors);
        }
      }

      // Small delay between batches to prevent rate limiting
      if (i + this.batchSize < reports.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      success: errors.length === 0,
      writtenCount,
      errors,
    };
  }
}
