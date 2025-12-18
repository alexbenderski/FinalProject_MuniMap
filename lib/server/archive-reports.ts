import { db } from "./firebase-admin";
import { Report } from "../types";
import { normalizeTimestamp } from "./normalizeTimestamp";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function archiveOldReports(): Promise<void> {
  const now = Date.now();
  const cutoff = now - ONE_YEAR_MS;

  const snapshot = await db.ref("Reports").once("value");
  if (!snapshot.exists()) return;

  const timestampFixes: Record<string, number> = {};
  const archiveUpdates: Record<string, Report | null> = {};

  snapshot.forEach((categorySnap) => {
    const category = categorySnap.key!; // garbage / lighting / tree

    categorySnap.forEach((reportSnap) => {
      const reportId = reportSnap.key!;
      const report = reportSnap.val() as Report;
      if (!report.timestamp) return;

      const tsMs = normalizeTimestamp(report.timestamp);

      // 🟢 שלב 1: תיקון timestamp בלבד
      if (tsMs !== report.timestamp) {
        timestampFixes[
          `Reports/${category}/${reportId}/timestamp`
        ] = tsMs;
      }

      // 🟢 שלב 2: ארכוב
      if (tsMs < cutoff) {
        const year = new Date(tsMs).getFullYear();

        archiveUpdates[
          `ArchivedReports/${year}/${category}/${reportId}`
        ] = {
          ...report,
          timestamp: tsMs,
        };

        archiveUpdates[
          `Reports/${category}/${reportId}`
        ] = null;
      }
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
