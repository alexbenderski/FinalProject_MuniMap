//components\dashboard\ArchivedReportsModal.tsx
"use client";
import { useState } from "react";

type FileType = "full" | "manual" | "anomalies";

export default function ArchivedReportsModal() {
  const today = new Date().toISOString().split("T")[0];
const oneYearAgo = "2018-01-01";

  const [fromDate, setFromDate] = useState(oneYearAgo);
  const [toDate, setToDate] = useState(today);
  const [fileType, setFileType] = useState<FileType>("full");
  const [category, setCategory] = useState("all");
  const [area, setArea] = useState("all");

  async function handleDownload() {
    const res = await fetch("/api/archive/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileType,
        fromDate,
        toDate,
        category,
        area,
      }),
    });

    if (!res.ok) {
      alert("No data found");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "archived_reports.xlsx";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-[650px] space-y-4">
      <h2 className="text-xl font-bold">Archived Reports</h2>

      <div className="flex gap-2">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      <select value={fileType} onChange={(e) => setFileType(e.target.value as FileType)}>
        <option value="full">Full</option>
        <option value="manual">Manual</option>
      </select>

      {fileType === "manual" && (
        <>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="tree">Tree</option>
            <option value="garbage">Garbage</option>
          </select>

          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="all">All Areas</option>
            <option value="Hadar">Hadar</option>
            <option value="Neve David">Neve David</option>
          </select>
        </>
      )}

      <button
        onClick={handleDownload}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        Download Excel
      </button>
    </div>
  );
}
