"use client";
import { useState } from "react";
import Modal from "@/components/dashboard/common/Modal";
import { Report } from "@/lib/types";
import ReportDetailsModal from "./ReportDetailsModal";
import { useLanguage } from "@/lib/i18n";
import { getReportCriticalityType } from "@/lib/server/sla";

interface SearchByIdModalProps {
  open: boolean;
  onClose: () => void;
}

// Criticality cell component
function CriticalityCell({ timestamp, type }: { timestamp: number; type: string }) {
  const { language } = useLanguage();
  const { level, key } = getReportCriticalityType(timestamp, type);
  const colorMap: Record<string, string> = {
    green: "bg-green-100 text-green-800 border-green-400",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-400",
    orange: "bg-orange-100 text-orange-800 border-orange-400",
    red: "bg-red-100 text-red-800 border-red-400",
  };
  
  const hebrewLabels: Record<string, string> = {
    green: "חדש",
    yellow: "בינוני",
    orange: "ישן",
    red: "קריטי",
  };
  
  const displayLabel = language === "he" ? hebrewLabels[key] || level : level;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colorMap[key] || "bg-gray-100"}`}>
      {displayLabel}
    </span>
  );
}

export default function SearchByIdModal({ open, onClose }: SearchByIdModalProps) {
  const { t, language } = useLanguage();
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchId.trim()) {
      setError(t("searchById.enterReportId"));
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      // Fetch all reports and search for the ID
      const response = await fetch("/api/reports");
      if (!response.ok) throw new Error("Failed to fetch reports");
      
      const data = await response.json();
      
      // Search through all report types
      let foundReport: Report | null = null;
      
      for (const type of Object.keys(data || {})) {
        const reportsOfType = data[type];
        if (reportsOfType) {
          for (const [id, reportData] of Object.entries(reportsOfType)) {
            if (id === searchId.trim() || id.includes(searchId.trim())) {
              foundReport = {
                ...(reportData as Omit<Report, "type" | "id">),
                type,
                id,
              };
              break;
            }
          }
        }
        if (foundReport) break;
      }

      if (foundReport) {
        setSearchResult(foundReport);
      } else {
        setError(t("searchById.notFound"));
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(t("searchById.searchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleReportUpdated = (updated: Report) => {
    setSearchResult(updated);
  };

  if (!open) return null;

  return (
    <>
      <Modal title={t("searchById.title")} onClose={onClose}>
        <div className="flex flex-col bg-white rounded-lg shadow-lg w-[700px] max-h-[80vh] overflow-hidden">
          
          {/* Search Input Section */}
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder={t("searchById.placeholder")}
                className="flex-1 border-2 border-gray-300 focus:border-blue-500 focus:outline-none px-4 py-3 rounded-lg font-medium text-lg transition-colors"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "⏳" : "🔍"} {t("searchById.search")}
              </button>
            </div>
            
            {error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 font-medium">
                ❌ {error}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="p-4 overflow-y-auto flex-1">
            {loading && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">⏳</div>
                {t("searchById.searching")}
              </div>
            )}

            {!loading && !searchResult && !error && (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🔍</div>
                {t("searchById.enterIdToSearch")}
              </div>
            )}

            {searchResult && (
              <div className="bg-white rounded-lg border shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold">
                    <tr>
                      <th className="p-3 text-center">📋 {t("reportsTable.columns.id")}</th>
                      <th className="p-3 text-center">📁 {t("reportsTable.columns.category")}</th>
                      <th className="p-3 text-left">📝 {t("reportsTable.columns.description")}</th>
                      <th className="p-3 text-center">⚠️ {t("reportsTable.columns.level")}</th>
                      <th className="p-3 text-center">📅 {t("reportsTable.columns.date")}</th>
                      <th className="p-3 text-center">✓ {t("reportsTable.columns.status")}</th>
                      <th className="p-3 text-center">⚙️ {t("reportsTable.columns.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-blue-50 transition-colors">
                      <td className="p-3 text-center font-mono text-xs text-gray-700">{searchResult.id}</td>
                      <td className="p-3 text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold capitalize">
                          {searchResult.type}
                        </span>
                      </td>
                      <td className="p-3 text-gray-800 font-medium max-w-[200px] truncate">{searchResult.description}</td>
                      <td className="p-3 text-center">
                        {searchResult.type ? <CriticalityCell timestamp={searchResult.timestamp} type={searchResult.type} /> : "—"}
                      </td>
                      <td className="p-3 text-center text-xs text-gray-700 whitespace-nowrap">
                        {new Date(searchResult.timestamp).toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
                          month: "short",
                          day: "numeric",
                          year: "2-digit"
                        })}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          searchResult.status === "resolved" ? "bg-green-100 text-green-800" :
                          searchResult.status === "in progress" ? "bg-yellow-100 text-yellow-800" :
                          searchResult.status === "pending" ? "bg-orange-100 text-orange-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {searchResult.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setDetailsOpen(true)}
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all"
                        >
                          📄 {t("reportsTable.details")}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Report Details Modal */}
      {detailsOpen && searchResult && (
        <ReportDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          report={searchResult}
          onReportUpdated={handleReportUpdated}
        />
      )}
    </>
  );
}
