// lib/server/archive-reports.ts
import { db } from "./firebase-admin";
import { Report } from "../types";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function archiveOldReports(): Promise<void> {
  const now = Date.now();
  const cutoff = now - ONE_YEAR_MS;

  const reportsRef = db.ref("Reports");
  const snapshot = await reportsRef.once("value");

  if (!snapshot.exists()) return;

  const updates: Record<string, Report | null> = {};

  snapshot.forEach((citySnap) => {
    const city = citySnap.key!;
    citySnap.forEach((reportSnap) => {
      const reportId = reportSnap.key!;
      const report = reportSnap.val() as Report;

      if (!report.timestamp) return;

      if (report.timestamp < cutoff) {
        const year = new Date(report.timestamp).getFullYear();

        updates[`ArchivedReports/${year}/${city}/${reportId}`] = report;
        updates[`Reports/${city}/${reportId}`] = null;
      }
    });
  });

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
    console.log(
      `📦 Archived ${Object.keys(updates).length / 2} reports`
    );
  }
}