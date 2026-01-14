// lib/server/archive-service.ts
import { db } from "./firebase-admin";
import { ArchivedReport, ArchiveExportPayload } from "./archive-types";
import { Report } from "@/lib/types";

/**
 * Fetch archived reports based on date range and filters
 * 
 * New path structure: /ArchivedReports/{year}/{month}/{city}/{type}/{id}
 */
export async function fetchArchivedReports(
  payload: ArchiveExportPayload
): Promise<ArchivedReport[]> {

  const fromTs = new Date(payload.fromDate).getTime();
  const toTs = new Date(payload.toDate).setHours(23, 59, 59, 999);

  const startYear = new Date(fromTs).getFullYear();
  const endYear = new Date(toTs).getFullYear();
  const startMonth = new Date(fromTs).getMonth() + 1;
  const endMonth = new Date(toTs).getMonth() + 1;

  const results: ArchivedReport[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearSnap = await db.ref(`ArchivedReports/${year}`).once("value");
    if (!yearSnap.exists()) continue;

    // New structure: {year}/{month}/{city}/{type}/{id}
    yearSnap.forEach((monthSnap) => {
      const month = parseInt(monthSnap.key ?? "0", 10);
      
      // Filter by month if within same year bounds
      if (year === startYear && month < startMonth) return;
      if (year === endYear && month > endMonth) return;

      monthSnap.forEach((citySnap) => {
        const city = citySnap.key ?? "Unknown";

        citySnap.forEach((typeSnap) => {
          const reportType = typeSnap.key ?? "Unknown";

          typeSnap.forEach((reportSnap) => {
            const report = reportSnap.val() as Report;
            if (!report.timestamp) return;

            if (report.timestamp < fromTs || report.timestamp > toTs) return;

            results.push({
              ...report,
              archivedYear: year,
              archivedCity: city,
            });
          });
        });
      });
    });
  }

  return results;
}
