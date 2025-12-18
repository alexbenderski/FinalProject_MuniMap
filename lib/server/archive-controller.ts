// lib/server/archive-controller.ts
import { db } from "./firebase-admin";
import { Report } from "@/lib/types";
import PDFDocument from "pdfkit";

export type FileType = "full" | "manual" | "anomalies";
export type GroupBy = "area" | "category";
export type ExportFormat = "excel" | "pdf";

export interface ArchiveExportPayload {
  fileType: FileType;
  fromDate: string;
  toDate: string;
  exportFormat: ExportFormat;
  groupBy?: GroupBy;
  category?: string;
  area?: string;
}

/* ───────────────────────────────────────────── */
/* Fetch archived reports from Firebase */
/* ───────────────────────────────────────────── */
export async function fetchArchivedReports(): Promise<Report[]> {
  const snap = await db.ref("ArchivedReports").once("value");
  if (!snap.exists()) return [];

  const result: Report[] = [];

  snap.forEach((yearSnap) => {
    yearSnap.forEach((typeSnap) => {
      typeSnap.forEach((reportSnap) => {
        result.push(reportSnap.val() as Report);
      });
    });
  });

  return result;
}

/* ───────────────────────────────────────────── */
/* Filter archived reports */
/* ───────────────────────────────────────────── */
export function filterArchivedReports(
  reports: Report[],
  payload: ArchiveExportPayload
): Report[] {
  const from = new Date(payload.fromDate).getTime();
  const to = new Date(payload.toDate).getTime();

  return reports.filter((r) => {
    if (!r.timestamp) return false;
    if (r.timestamp < from || r.timestamp > to) return false;

    if (payload.fileType === "manual") {
      if (payload.category && payload.category !== "all" && r.type !== payload.category)
        return false;

      if (payload.area && payload.area !== "all" && r.area !== payload.area)
        return false;
    }

    return true;
  });
}

/* ───────────────────────────────────────────── */
/* Build PDF */
/* ───────────────────────────────────────────── */
export async function buildArchivePDF(reports: Report[]): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).text("Archived Reports", { underline: true });
    doc.moveDown();

    reports.forEach((r, i) => {
      doc
        .fontSize(12)
        .text(`${i + 1}. ${r.type?.toUpperCase()} | ${r.area}`)
        .text(`Status: ${r.status}`)
        .text(`Date: ${new Date(r.timestamp).toLocaleDateString()}`)
        .text(`Description: ${r.description ?? "-"}`)
        .moveDown();
    });

    doc.end();
  });
}
