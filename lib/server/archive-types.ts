// lib/server/archive-types.ts
import { Report } from "@/lib/types";

export type ArchiveFileType = "full" | "manual" | "anomalies";
export type ArchiveGroupBy = "area" | "category";
export type ExportFormat = "excel" | "pdf";

export interface ArchiveExportPayload {
  fileType: ArchiveFileType;
  fromDate: string;
  toDate: string;
  format: ExportFormat;

  // manual only
  groupBy?: ArchiveGroupBy;
  area?: string;      // "all" | specific
  category?: string;  // "all" | specific
}

export interface ArchivedReport extends Report {
  archivedYear: number;
  archivedCity?: string;
}
