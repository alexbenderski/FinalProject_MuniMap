import { Request, Response } from "express";
import { db } from "./firebase-admin";
import { Report } from "@/lib/types";
import XLSX from "xlsx";
import PDFDocument from  "pdfkit";

/* ───────────────────────────── */
/* Types */
/* ───────────────────────────── */

type FileType = "full" | "manual" | "anomalies";
type GroupBy = "area" | "category";

interface ExportPayload {
  fileType: FileType;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  groupBy?: GroupBy;
  category?: string; // "all" | specific
  area?: string;     // "all" | specific
  format?: "excel" | "pdf";
}

/* ───────────────────────────── */
/* Helpers */
/* ───────────────────────────── */

function inRange(ts: number, from: number, to: number) {
  return ts >= from && ts <= to;
}

function flattenArchivedReports(
  data: unknown,
  from: number,
  to: number
): Report[] {
  const result: Report[] = [];

  if (typeof data !== "object" || data === null) return result;

  const years = data as Record<string, unknown>;

  for (const year of Object.values(years)) {
    if (typeof year !== "object" || year === null) continue;

    const types = year as Record<string, unknown>;

    for (const typeGroup of Object.values(types)) {
      if (typeof typeGroup !== "object" || typeGroup === null) continue;

      const reports = typeGroup as Record<string, Report>;

      for (const r of Object.values(reports)) {
        if (!r.timestamp) continue;
        if (!inRange(r.timestamp, from, to)) continue;
        result.push(r);
      }
    }
  }

  return result;
}

/* ───────────────────────────── */
/* Excel */
/* ───────────────────────────── */

function exportExcel(res: Response, rows: Report[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(
    rows.map(r => ({
      id: r.id ?? "",
      area: r.area ?? "",
      category: r.type ?? "",
      status: r.status ?? "",
      submittedBy: r.submittedBy ?? "",
      timestamp: new Date(r.timestamp).toISOString(),
      resolvedAt: r.resolvedAt
        ? new Date(r.resolvedAt).toISOString()
        : "",
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "ArchivedReports");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.xlsx"`
  );

  res.send(buffer);
}

/* ───────────────────────────── */
/* PDF */
/* ───────────────────────────── */

function exportPDF(res: Response, rows: Report[], filename: string) {
  const doc = new PDFDocument({ margin: 30, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.pdf"`
  );

  doc.pipe(res);

  doc.fontSize(18).text("Archived Reports", { underline: true });
  doc.moveDown();

  rows.forEach((r, i) => {
    doc
      .fontSize(10)
      .text(
        `${i + 1}. Area: ${r.area} | Category: ${r.type} | Status: ${r.status}`
      )
      .text(`   Submitted: ${new Date(r.timestamp).toLocaleDateString()}`)
      .moveDown(0.5);
  });

  doc.end();
}

/* ───────────────────────────── */
/* Main handler */
/* ───────────────────────────── */

export async function exportArchivedReports(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const payload = req.body as ExportPayload;

    const from = new Date(payload.fromDate).getTime();
    const to = new Date(payload.toDate).setHours(23, 59, 59, 999);

    const snap = await db.ref("ArchivedReports").once("value");
    if (!snap.exists()) {
      res.status(404).json({ error: "No archived reports found" });
      return;
    }

    let reports = flattenArchivedReports(snap.val(), from, to);

    /* ───────── Manual filters ───────── */
    if (payload.fileType === "manual") {
      if (payload.category && payload.category !== "all") {
        reports = reports.filter(r => r.type === payload.category);
      }

      if (payload.area && payload.area !== "all") {
        reports = reports.filter(r => r.area === payload.area);
      }
    }

    const format = payload.format ?? "excel";
    const filename = `archived_reports_${payload.fileType}`;

    if (format === "pdf") {
      exportPDF(res, reports, filename);
    } else {
      exportExcel(res, reports, filename);
    }
  } catch (err) {
    console.error("❌ archive export failed:", err);
    res.status(500).json({ error: "Archive export failed" });
  }
}