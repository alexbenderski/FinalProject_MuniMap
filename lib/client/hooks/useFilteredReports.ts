import { useMemo } from "react";
import { Report } from "@/lib/types";
import { getReportCriticalityType } from "@/lib/server/sla";

export function useFilteredReports(
  reports: Report[],
  {
    selectedArea,
    selectedTypes,
    status,
    statusList,
    dateFrom,
    dateTo,
    mediaOnly,
    criticality,
    criticalityList,
  }: {
    selectedArea: string | null;
    selectedTypes: string[];
    status: "open" | "pending" | "in progress" | "resolved" | "all";
    statusList?: string[];
    dateFrom: string | null;
    dateTo: string | null;
    mediaOnly: boolean;
    criticality?: string;
    criticalityList?: string[];
  }
) {
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const areaMatch = !selectedArea || r.area === selectedArea;
      const typeMatch =
        selectedTypes.length === 0 || selectedTypes.includes(r.type ?? "");

      // Handle multiple status selection
      const statusMatch = statusList && statusList.length > 0
        ? statusList.includes(r.status)
        : status === "all"
          ? r.status !== "resolved"
          : r.status === status;

      const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
      const toMs = dateTo ? new Date(dateTo).getTime() : null;

      const timeMatch =
        (!fromMs || r.timestamp >= fromMs) &&
        (!toMs || r.timestamp <= toMs);

      const mediaMatch = !mediaOnly || r.media === true;

      // Handle multiple criticality selection using actual SLA calculation
      let criticalityMatch = true;
      if (criticalityList && criticalityList.length > 0) {
        const reportColor = getReportCriticalityType(r);
        criticalityMatch = criticalityList.includes(reportColor);
      } else if (criticality) {
        const reportColor = getReportCriticalityType(r);
        criticalityMatch = reportColor === criticality;
      }

      return (
        areaMatch &&
        typeMatch &&
        statusMatch &&
        timeMatch &&
        mediaMatch &&
        criticalityMatch
      );
    });
  }, [reports, selectedArea, selectedTypes, status, statusList, dateFrom, dateTo, mediaOnly, criticality, criticalityList]);

  return { filteredReports };
}
