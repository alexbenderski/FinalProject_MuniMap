import { useMemo } from "react";
import { Report } from "@/lib/types";

export function useFilteredReports(
  reports: Report[],
  {
    selectedArea,
    selectedTypes,
    status,
    dateFrom,
    dateTo,
    mediaOnly,
    criticality,
  }: {
    selectedArea: string | null;
    selectedTypes: string[];
    status: "open" | "pending" | "in progress" | "resolved" | "all";
    dateFrom: string | null;
    dateTo: string | null;
    mediaOnly: boolean;
    criticality?: string;
  }
) {
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (r.deleted) return false;

      const areaMatch = !selectedArea || r.area === selectedArea;
      const typeMatch =
        selectedTypes.length === 0 || selectedTypes.includes(r.type ?? "");

      const statusMatch =
        status === "all"
          ? r.status !== "resolved"
          : r.status === status;

      const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
      const toMs = dateTo ? new Date(dateTo).getTime() : null;

      const timeMatch =
        (!fromMs || r.timestamp >= fromMs) &&
        (!toMs || r.timestamp <= toMs);

      const mediaMatch = !mediaOnly || r.media === true;

      // criticality checker
      let criticalityMatch = true;
      if (criticality) {
        const now = Date.now();
        const diffDays = Math.floor((now - r.timestamp) / (1000 * 60 * 60 * 24));
        const color =
          diffDays <= 5 ? "green" :
          diffDays <= 14 ? "yellow" :
          diffDays <= 30 ? "orange" : "red";
        criticalityMatch = color === criticality;
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
  }, [reports, selectedArea, selectedTypes, status, dateFrom, dateTo, mediaOnly, criticality]);

  return { filteredReports };
}
