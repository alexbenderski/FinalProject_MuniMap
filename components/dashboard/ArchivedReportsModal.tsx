//components\dashboard\ArchivedReportsModal.tsx
"use client";
import { useState } from "react";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { useAuth } from "@/components/AuthProvider";
import Image from "next/image";

type FileType = "full" | "manual" | "anomalies";

export default function ArchivedReportsModal() {
  const { permissions } = useAuth();
  const city = permissions?.city || "";
  
  // For archived reports: max date is 1 year ago
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const archivedReportsMaxDate = oneYearAgo.toISOString().split("T")[0];
  
  // For anomalies: max date is today
  const today = new Date().toISOString().split("T")[0];
  
  // Oldest date - 5 years back
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const oldestDate = fiveYearsAgo.toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(oldestDate);
  const [toDate, setToDate] = useState(archivedReportsMaxDate);
  const [fileType, setFileType] = useState<FileType>("full");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Determine max date based on file type
  const maxDate = fileType === "anomalies" ? today : archivedReportsMaxDate;

  // Update date range when switching between report types
  const handleFileTypeChange = (type: FileType) => {
    setFileType(type);
    if (type === "anomalies") {
      // For anomalies, set date range to last 5 years (from oldestDate to today)
      setToDate(today);
      setFromDate(oldestDate);
    } else {
      // For reports, set date range to archived reports (from oldestDate to 1 year ago)
      setToDate(archivedReportsMaxDate);
      setFromDate(oldestDate);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const selectAllCategories = () => setSelectedCategories(Array.from(CATEGORIES));
  const unselectAllCategories = () => setSelectedCategories([]);

  async function handleDownload() {
    // For anomalies, download without category filtering
    if (fileType === "anomalies") {
      const res = await fetch("/api/archive/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType: "anomalies",
          fromDate,
          toDate,
          category: "all",
          area: city,
        }),
      });

      if (!res.ok) {
        alert("No anomalies data found");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `anomalies_${city}_${fromDate}_to_${toDate}.xlsx`;
      a.click();

      URL.revokeObjectURL(url);
      alert("Successfully downloaded anomalies report!");
      return;
    }

    // For reports (full or manual mode)
    const categoriesToExport = fileType === "full" || selectedCategories.length === 0 
      ? ["all"] 
      : selectedCategories;

    const failedCategories: string[] = [];
    let successCount = 0;

    for (const cat of categoriesToExport) {
      const res = await fetch("/api/archive/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType,
          fromDate,
          toDate,
          category: cat,
          area: city, // Always use the worker's city
        }),
      });

      if (!res.ok) {
        const categoryLabel = cat === "all" ? "All Categories" : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS];
        failedCategories.push(categoryLabel);
        continue;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const categoryLabel = cat === "all" ? "all" : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS];
      a.download = `archived_reports_${city}_${categoryLabel}_${fromDate}_to_${toDate}.xlsx`;
      a.click();

      URL.revokeObjectURL(url);
      successCount++;
      
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Show one consolidated alert at the end if there were failures
    if (failedCategories.length > 0) {
      if (successCount === 0) {
        alert(`No data found for: ${failedCategories.join(", ")}`);
      } else {
        alert(`Successfully downloaded ${successCount} file(s).\n\nNo data found for: ${failedCategories.join(", ")}`);
      }
    } else if (successCount > 0) {
      alert(`Successfully downloaded ${successCount} file(s)!`);
    }
  }

  return (
    <div className="w-[700px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-2xl p-8 space-y-6">
      {/* Header */}
      <div className="text-center border-b-2 border-indigo-300 pb-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">📦 Archived Reports</h2>
        <p className="text-sm text-gray-600">Export reports for: <span className="font-semibold text-indigo-600">{city}</span></p>
      </div>

      {/* Date Range Section */}
      <div className="bg-white rounded-lg p-5 shadow-md">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          📅 {fileType === "anomalies" ? "Date Range (Last 5 Years)" : "Date Range (Archived Reports - Older than 1 year)"}
        </label>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              min={oldestDate}
              max={maxDate}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            />
            <p className="text-xs text-gray-400 mt-1">Min: {oldestDate}</p>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={oldestDate}
              max={maxDate}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            />
            <p className="text-xs text-gray-400 mt-1">Max: {maxDate}</p>
          </div>
        </div>
      </div>

      {/* Export Type Section */}
      <div className="bg-white rounded-lg p-5 shadow-md">
        <label className="block text-sm font-semibold text-gray-700 mb-3">📊 Export Type</label>
        <div className="flex gap-3">
          <button
            onClick={() => handleFileTypeChange("full")}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              fileType === "full"
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📋 Full Reports
          </button>
          <button
            onClick={() => handleFileTypeChange("manual")}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              fileType === "manual"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            🎯 Manual Selection
          </button>
          <button
            onClick={() => handleFileTypeChange("anomalies")}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              fileType === "anomalies"
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            ⚠️ Anomalies
          </button>
        </div>
      </div>

      {/* Manual Selection Options */}
      {fileType === "manual" && (
        <div className="bg-white rounded-lg p-5 shadow-md space-y-4 animate-fadeIn">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">🏷️ Categories (Select Multiple)</label>
            
            {/* Selected Categories Display */}
            {selectedCategories.length > 0 && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md max-h-24 overflow-y-auto">
                <p className="text-xs text-gray-600 mb-2">Selected ({selectedCategories.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className="bg-green-300 border border-green-600 rounded-lg px-3 py-1 text-sm hover:bg-green-400 transition-colors flex items-center gap-1"
                    >
                      {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]} ✕
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Select All / Unselect All */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={selectAllCategories}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm font-semibold"
              >
                Select All
              </button>
              <button
                onClick={unselectAllCategories}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-semibold"
              >
                Unselect All
              </button>
            </div>

            {/* Category Buttons */}
            <div className="flex flex-wrap gap-2">
              {Array.from(CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    selectedCategories.includes(cat)
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                  }`}
                >
                  <Image
                    src={`/icons/green_${cat.toLowerCase()}.png`}
                    alt={cat}
                    width={20}
                    height={20}
                    className="w-5 h-5"
                    unoptimized
                  />
                  {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
      >
        ⬇️ Download Excel Report
      </button>

      {/* Info Footer */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-200">
        All exported data is filtered for <span className="font-semibold">{city}</span> only
      </div>
    </div>
  );
}
