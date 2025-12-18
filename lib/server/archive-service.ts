// lib/server/archive-service.ts
import { db } from "./firebase-admin";
import { ArchivedReport, ArchiveExportPayload } from "./archive-types";
import { Report } from "@/lib/types";

export async function fetchArchivedReports(
  payload: ArchiveExportPayload
): Promise<ArchivedReport[]> {

  const fromTs = new Date(payload.fromDate).getTime();
  const toTs = new Date(payload.toDate).setHours(23, 59, 59, 999);

  const startYear = new Date(fromTs).getFullYear();
  const endYear = new Date(toTs).getFullYear();

  const results: ArchivedReport[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearSnap = await db.ref(`ArchivedReports/${year}`).once("value");
    if (!yearSnap.exists()) continue;

    yearSnap.forEach((citySnap) => {
      const city = citySnap.key ?? "Unknown";

      citySnap.forEach((reportSnap) => {
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
  }

  return results;
}
