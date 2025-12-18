// lib/server/archive-filters.ts
import { ArchivedReport, ArchiveExportPayload } from "./archive-types";

export function filterArchivedReports(
  reports: ArchivedReport[],
  payload: ArchiveExportPayload
): ArchivedReport[] {

  if (payload.fileType !== "manual") return reports;

  return reports.filter((r) => {
    if (payload.area && payload.area !== "all" && r.area !== payload.area) {
      return false;
    }

    if (
      payload.category &&
      payload.category !== "all" &&
      r.type !== payload.category
    ) {
      return false;
    }

    return true;
  });
}
