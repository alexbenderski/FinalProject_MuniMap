"use client";
import { useState } from "react";

type FileType = "full" | "manual" | "anomalies";
type GroupBy = "area" | "category";
type ExportFormat = "excel" | "pdf";

interface ArchiveExportPayload {
  fileType: FileType;
  fromDate: string;
  toDate: string;
  exportFormat: ExportFormat;
  groupBy?: GroupBy;
  category?: string;
  area?: string;
}
export default function ArchivedReportsModal() {
  // ──────────────── Date limits (last year only)
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().split("T")[0];

  // ──────────────── State
  const [fromDate, setFromDate] = useState(oneYearAgoStr);
  const [toDate, setToDate] = useState(todayStr);
  const [fileType, setFileType] = useState<FileType>("full");

  // Manual filters
  const [groupBy, setGroupBy] = useState<GroupBy>("area");
  const [category, setCategory] = useState<string>("all");
  const [area, setArea] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel");

  const isManual = fileType === "manual";


function downloadDummyExcel(payload: ArchiveExportPayload) {
  const csv = [
    "Type,From,To",
    `${payload.fileType},${payload.fromDate},${payload.toDate}`,
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "archived_reports.csv";
  a.click();

  URL.revokeObjectURL(url);
}


function downloadDummyPDF(payload: ArchiveExportPayload) {
  const content = `
Archived Reports

Type: ${payload.fileType}
From: ${payload.fromDate}
To: ${payload.toDate}

Generated at: ${new Date().toLocaleString()}
`;

  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "archived_reports.pdf";
  a.click();

  URL.revokeObjectURL(url);
}




async function handleDownload() {
  const payload: ArchiveExportPayload = {
    fileType,
    fromDate,
    toDate,
    exportFormat,
    ...(isManual && { groupBy, category, area }),
  };

  console.log("📦 Export payload:", payload);

  if (exportFormat === "excel") {
    downloadDummyExcel(payload);
  } else {
    downloadDummyPDF(payload);
  }
}


  return (
    <div className="w-[650px] max-w-full space-y-6">

      {/* Date Range */}
      <div className="space-y-2">
        <h3 className="font-semibold">Choose time range</h3>
        <div className="flex gap-3">
          <label className="text-sm">
            from:
            <input
              type="date"
              value={fromDate}
              min={oneYearAgoStr}
              max={todayStr}
              onChange={(e) => setFromDate(e.target.value)}
              className="ml-2 border rounded px-2 py-1"
            />
          </label>
          <label className="text-sm">
            to:
            <input
              type="date"
              value={toDate}
              min={oneYearAgoStr}
              max={todayStr}
              onChange={(e) => setToDate(e.target.value)}
              className="ml-2 border rounded px-2 py-1"
            />
          </label>
        </div>
      </div>

      {/* File Type */}
      <div className="space-y-2">
        <h3 className="font-semibold">Choose file type</h3>
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value as FileType)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="full">Full Archived Reports</option>
          <option value="manual">Manual Reports Filter</option>
          <option value="anomalies">Anomaly Reports</option>
        </select>
      </div>

      {/* Manual Filters */}
      {isManual && (
        <div className="space-y-4 border rounded-md p-4 bg-gray-50">

          <div>
            <label className="text-sm font-medium">Group by</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="w-full border rounded px-2 py-1 mt-1"
            >
              <option value="area">Area</option>
              <option value="category">Category</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded px-2 py-1 mt-1"
            >
              <option value="all">All</option>
              <option value="garbage">Garbage</option>
              <option value="lighting">Lighting</option>
              <option value="tree">Tree</option>
              <option value="parking">Parking</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Area</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full border rounded px-2 py-1 mt-1"
            >
              <option value="all">All</option>
              <option value="Hadar">Hadar</option>
              <option value="Neve David">Neve David</option>
              <option value="Bat Galim">Bat Galim</option>
              <option value="Halissa">Halissa</option>
            </select>
          </div>
        </div>
      )}


{/* Export format */}
<div className="space-y-2">
  <h3 className="font-semibold">Export format</h3>
  <div className="flex gap-4">
    <label className="flex items-center gap-2">
      <input
        type="radio"
        value="excel"
        checked={exportFormat === "excel"}
        onChange={() => setExportFormat("excel")}
      />
      Excel (.xlsx)
    </label>

    <label className="flex items-center gap-2">
      <input
        type="radio"
        value="pdf"
        checked={exportFormat === "pdf"}
        onChange={() => setExportFormat("pdf")}
      />
      PDF
    </label>
  </div>
</div>



      {/* Actions */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleDownload}
          className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
        >
          Download
        </button>
      </div>
    </div>
  );
}
