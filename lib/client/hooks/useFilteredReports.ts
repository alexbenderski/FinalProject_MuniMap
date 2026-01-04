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
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
    // Add 23:59:59.999 to include the entire "to" day
    const toMs = dateTo ? new Date(dateTo).getTime() + (24 * 60 * 60 * 1000 - 1) : null;

    const filtered = reports.filter((r) => {
      // Area filter - match city
      const areaMatch = !selectedArea || r.area === selectedArea;
      
      // Type/category filter
      const typeMatch =
        selectedTypes.length === 0 || selectedTypes.includes(r.type ?? "");

      // Status filter - handle multiple status selection
      const statusMatch = statusList && statusList.length > 0
        ? statusList.includes(r.status)
        : status === "all"
          ? r.status !== "resolved"
          : r.status === status;

      // Time/date filter
      const timeMatch =
        (!fromMs || r.timestamp >= fromMs) &&
        (!toMs || r.timestamp <= toMs);

      // Media filter
      const mediaMatch = !mediaOnly || r.media === true;

      // Criticality filter using actual SLA calculation
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

    return filtered;
  }, [reports, selectedArea, selectedTypes, status, statusList, dateFrom, dateTo, mediaOnly, criticality, criticalityList]);

  return { filteredReports };
}
