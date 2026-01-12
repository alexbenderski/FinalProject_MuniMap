"use client";
import { useEffect, useState } from "react";
import { fetchAnomalies, fetchReports, subscribeToAnomalies } from "@/lib/client/fetchers";
import Modal from "@/components/dashboard/common/Modal";
import { Anomaly, Report } from "@/lib/types";
import AnomalyDetailsModal from "@/components/dashboard/anomalies/AnomalyDetailsModal";
import { markAnomalyAsReviewed } from "@/lib/client/fetchers";
import { getCurrentUserInfo } from "@/lib/client/fetchers";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/components/AuthProvider";

export default function AnomaliesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  selectedArea: string | null;
}) {
  const { t, language } = useLanguage();
  const { permissions } = useAuth();
  const userCity = permissions?.city || null;
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [anomalyDetailsOpen, setAnomalyDetailsOpen] = useState(false);
  const [reportsForAnomaly, setReportsForAnomaly] = useState<Report[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [sortKey, setSortKey] = useState<"type" | "reports" | "status" | "firstDetected" | "lastUpdated" | "severity" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    // Subscribe to real-time anomalies updates
    const unsubscribe = subscribeToAnomalies((data) => {
      setAnomalies(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [open]);

  if (!open) return null;

  const handleSort = (key: "type" | "reports" | "status" | "firstDetected" | "lastUpdated" | "severity") => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

    const filtered = anomalies.filter((a) => {
      // ✅ Filter by user's city first
      if (userCity && a.area !== userCity) {
        return false;
      }

      const s = search.toLowerCase();

      return (
        (a.title?.toLowerCase() ?? "").includes(s) ||
        (a.description?.toLowerCase() ?? "").includes(s) ||
        (a.area?.toLowerCase() ?? "").includes(s) ||
        (a.status?.toLowerCase() ?? "").includes(s)
      );
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: number | Date | string = 0, bVal: number | Date | string = 0;

      if (sortKey === "type") {
        aVal = a.category || "";
        bVal = b.category || "";
      } else if (sortKey === "reports") {
        aVal = a.metrics?.currentReports ?? a.relatedReports?.length ?? 0;
        bVal = b.metrics?.currentReports ?? b.relatedReports?.length ?? 0;
      } else if (sortKey === "status") {
        const { safeKey } = getCurrentUserInfo();
        aVal = (a.reviewedBy && safeKey && a.reviewedBy[safeKey]) ? 1 : 0;
        bVal = (b.reviewedBy && safeKey && b.reviewedBy[safeKey]) ? 1 : 0;
      } else if (sortKey === "firstDetected") {
        aVal = new Date(a.firstDetected).getTime();
        bVal = new Date(b.firstDetected).getTime();
      } else if (sortKey === "lastUpdated") {
        aVal = new Date(a.lastUpdated).getTime();
        bVal = new Date(b.lastUpdated).getTime();
      } else if (sortKey === "severity") {
        // Map severity to numeric values for sorting (high=3, medium=2, low=1)
        const severityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
        aVal = severityMap[a.severity || "low"] || 1;
        bVal = severityMap[b.severity || "low"] || 1;
      }

      if (aVal === bVal) return 0;
      
      // Handle string comparison for type
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortDir === "asc" ? comparison : -comparison;
      }
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDir === "asc" ? comparison : -comparison;
    });


async function handleMarkReviewed(anomaly: Anomaly) {
  const { safeKey } = getCurrentUserInfo();
  
  if (!safeKey) {
    alert("❌ User not authenticated. Please log in first.");
    return;
  }

  try {
    const result = await markAnomalyAsReviewed(anomaly);

    if (result.alreadyReviewed) {
      alert("✅ You already reviewed this anomaly");
      return;
    }

    setAnomalies((prev) =>
      prev
        .map((a): Anomaly => {
          if (a.id !== anomaly.id) return a;

          const safeEmail = result.email?.replace(/\./g, "_") ?? safeKey;
          const safeTimestamp = result.timestamp ?? Date.now();

          return {
            ...a,
            reviewedBy: {
              ...(a.reviewedBy ?? {}) as Record<string, number>,
              [safeEmail]: safeTimestamp,
            },
          };
        }) as Anomaly[]
    );

    alert(`✅ Marked as reviewed by ${result.email}`);
  } catch (err) {
    console.error("Error marking anomaly as reviewed:", err);
    alert(`❌ Failed to mark as reviewed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}




  
  return (
    <Modal title={`🚨 ${t("anomalies.title")}`} onClose={onClose}>
      <div className="w-[1200px] max-h-[80vh] overflow-y-auto bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4 rounded-lg shadow-lg">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin text-4xl mb-3">⚙️</div>
            <p className="text-gray-600 font-semibold">{t("anomalies.loadingAnomalies")}</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-gray-600 font-semibold">{t("anomalies.noAnomaliesDetected")}</p>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-red-500">
              <div className="flex justify-between items-center gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={`🔍 ${t("anomalies.searchPlaceholder")}`}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none transition-colors font-medium"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="bg-red-100 border-2 border-red-300 rounded-lg px-4 py-2">
                  <span className="text-sm font-bold text-red-700">
                    📍 {filtered.length} {t("anomalies.found")}
                  </span>
                </div>
              </div>
            </div>

            {/* Table with Enhanced Styling */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border-t-4 border-red-500">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-center">#</th>
                    <th
                      className="p-3 text-center cursor-pointer hover:bg-red-600 transition-colors"
                      onClick={() => handleSort("type")}
                    >
                      📁 {t("anomalies.type")} {sortKey === "type" && (sortDir === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="p-3 text-center cursor-pointer hover:bg-red-600 transition-colors"
                      onClick={() => handleSort("severity")}
                    >
                      ⚠️ {t("anomalies.severity")} {sortKey === "severity" && (sortDir === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="p-3 text-left">📝 {t("anomalies.description")}</th>
                    <th className="p-3 text-center">📍 {t("anomalies.area")}</th>
                    <th
                      className="p-3 text-center cursor-pointer hover:bg-red-600 transition-colors"
                      onClick={() => handleSort("reports")}
                    >
                      📊 {t("anomalies.reportsCount")} {sortKey === "reports" && (sortDir === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="p-3 text-center cursor-pointer hover:bg-red-600 transition-colors"
                      onClick={() => handleSort("status")}
                    >
                      ✓ {t("anomalies.reviewStatus")} {sortKey === "status" && (sortDir === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="p-3 text-center cursor-pointer hover:bg-red-600 transition-colors"
                      onClick={() => handleSort("firstDetected")}
                    >
                      📅 {t("anomalies.firstDetected")} {sortKey === "firstDetected" && (sortDir === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="p-3 text-center cursor-pointer hover:bg-red-600 transition-colors"
                      onClick={() => handleSort("lastUpdated")}
                    >
                      ⏰ {t("anomalies.lastUpdated")} {sortKey === "lastUpdated" && (sortDir === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="p-3 text-center">⚙️ {t("anomalies.actions")}</th>
                  </tr>
                </thead>
<tbody>
  {sorted.map((a, index) => {
    const metrics = a.metrics ?? {};

    return (
      <tr key={a.id} className="border-b hover:bg-red-50 transition-colors">
        <td className="p-3 text-center font-bold text-red-600">{index + 1}</td>

        {/* type name */}
        <td className="p-3 text-center">
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold capitalize">
            {a.category || "unknown"}
          </span>
        </td>

        {/* severity */}
        <td className="p-3 text-center">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            a.severity === "high" ? "bg-red-100 text-red-800 border-2 border-red-300" :
            a.severity === "medium" ? "bg-orange-100 text-orange-800 border-2 border-orange-300" :
            "bg-yellow-100 text-yellow-800 border-2 border-yellow-300"
          }`}>
            {a.severity === "high" ? `🔴${t("anomalies.severityHigh")}` :
             a.severity === "medium" ? `🟠${t("anomalies.severityMedium")}` :
             `🟡 ${t("anomalies.severityLow")}`}
          </span>
        </td>

        {/* description */}
        <td className="p-3 font-semibold text-gray-800">{a.description}</td>

        {/* area */}
        <td className="p-3 text-center">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
            {a.area}
          </span>
        </td>

        {/* num of reports */}
        <td className="p-3 text-center">
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
            {metrics.currentReports ?? a.relatedReports?.length ?? 0}
          </span>
        </td>

        {/* status / reviewed */}
        <td className="p-3 text-center">
          <button
            onClick={() => {
              const { safeKey } = getCurrentUserInfo();
              
              if (!safeKey) {
                alert(t("anomalies.userNotAuthenticated"));
                return;
              }

              const isReviewed = !!(a.reviewedBy && a.reviewedBy[safeKey]);

              if (isReviewed) {
                alert(t("anomalies.alreadyReviewedAlert"));
                return;
              }

              if (confirm(t("reportsTable.confirmReview"))) {
                handleMarkReviewed(a);
              }
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              (() => {
                const { safeKey } = getCurrentUserInfo();
                const isReviewed = !!(a.reviewedBy && safeKey && a.reviewedBy[safeKey]);
                return isReviewed
                  ? "bg-green-200 text-green-800 border-2 border-green-400 cursor-default"
                  : "bg-yellow-200 text-yellow-800 border-2 border-yellow-400 hover:bg-yellow-300";
              })()
            }`}
          >
            {(() => {
              const { safeKey } = getCurrentUserInfo();
              const isReviewed = !!(a.reviewedBy && safeKey && a.reviewedBy[safeKey]);
              return isReviewed ? `✅ ${t("anomalies.reviewed")}` : `⏳ ${t("anomalies.markAsReviewed")}`;
            })()}
          </button>
        </td>

        {/* first date */}
        <td className="p-3 text-center text-xs text-gray-700">
          {new Date(a.firstDetected).toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
            month: "short",
            day: "numeric",
            year: "2-digit",
          })}
        </td>

        {/* last date */}
        <td className="p-3 text-center text-xs text-gray-700">
          {new Date(a.lastUpdated).toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
            month: "short",
            day: "numeric",
            year: "2-digit",
          })}
        </td>

        {/* actions */}
        <td className="p-3 text-center">
          <button
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg px-3 py-1 text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1 mx-auto"
            onClick={async () => {
              const allReports = await fetchReports();
              const related: Report[] = [];

              Object.entries(allReports).forEach(([type, group]) => {
                Object.entries(
                  group as Record<string, Omit<Report, "type" | "id">>
                ).forEach(([id, r]) => {
                  if (a.relatedReports.includes(id)) {
                    related.push({ ...r, id, type });
                  }
                });
              });

              setReportsForAnomaly(related);
              setSelectedAnomaly(a);
              setAnomalyDetailsOpen(true);
            }}
          >
            🔍 {t("anomalies.viewDetails")}
          </button>
        </td>
      </tr>
    );
  })}
</tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {anomalyDetailsOpen && selectedAnomaly && (
        <AnomalyDetailsModal
          open={anomalyDetailsOpen}
          onClose={() => {
            setAnomalyDetailsOpen(false);
            // ✅ Refetch anomalies to ensure DB changes are reflected
            (async () => {
              const updated = await fetchAnomalies();
              setAnomalies(updated);
            })();
          }}
          anomaly={selectedAnomaly}
          reports={reportsForAnomaly}
          onReviewUpdate={(updated) => {
            // ✅ Update the list immediately so UI reflects change
            setAnomalies((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
            );
          }}
        />
      )}
  
    </Modal>
  );
}
