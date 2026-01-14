import { db } from "./firebase-admin";
import { Report } from "../types";
import { normalizeTimestamp } from "./normalizeTimestamp";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Archive old reports from ActiveReports to ArchivedReports
 * 
 * Source: /Reports/ActiveReports/{city}/{type}/{id}
 * Target: /ArchivedReports/{year}/{month}/{city}/{type}/{id}
 */
export async function archiveOldReports(): Promise<void> {
  const now = Date.now();
  const cutoff = now - ONE_YEAR_MS;

  // New path: /Reports/ActiveReports
  const snapshot = await db.ref("Reports/ActiveReports").once("value");
  if (!snapshot.exists()) return;

  const timestampFixes: Record<string, number> = {};
  const archiveUpdates: Record<string, Report | null> = {};

  snapshot.forEach((citySnap) => {
    const city = citySnap.key!;

    citySnap.forEach((categorySnap) => {
      const category = categorySnap.key!; // garbage / lighting / tree / hazard

      categorySnap.forEach((reportSnap) => {
        const reportId = reportSnap.key!;
        const report = reportSnap.val() as Report;
        if (!report.timestamp) return;

        const tsMs = normalizeTimestamp(report.timestamp);

        // 🟢 שלב 1: תיקון timestamp בלבד
        if (tsMs !== report.timestamp) {
          timestampFixes[
            `Reports/ActiveReports/${city}/${category}/${reportId}/timestamp`
          ] = tsMs;
        }

        // 🟢 שלב 2: ארכוב
        if (tsMs < cutoff) {
          const date = new Date(tsMs);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0'); // "01" to "12"

          // New archive path: /ArchivedReports/{year}/{month}/{city}/{type}/{id}
          archiveUpdates[
            `ArchivedReports/${year}/${month}/${city}/${category}/${reportId}`
          ] = {
            ...report,
            timestamp: tsMs,
          };

          // Remove from active reports
          archiveUpdates[
            `Reports/ActiveReports/${city}/${category}/${reportId}`
          ] = null;
        }
      });
    });
  });

  // 🔧 קודם מתקנים timestamps
  if (Object.keys(timestampFixes).length > 0) {
    await db.ref().update(timestampFixes);
    console.log(`🛠 Fixed ${Object.keys(timestampFixes).length} timestamps`);
  }

  // 📦 ואז מאכסנים ומוחקים
  if (Object.keys(archiveUpdates).length > 0) {
    await db.ref().update(archiveUpdates);
    console.log(
      `📦 Archived ${Object.keys(archiveUpdates).filter(k =>
        k.startsWith("ArchivedReports")
      ).length} reports`
    );
  }
}
