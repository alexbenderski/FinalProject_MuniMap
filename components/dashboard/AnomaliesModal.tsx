"use client";
import { useEffect, useState } from "react";
import { fetchAnomalies, fetchReports, subscribeToAnomalies } from "@/lib/client/fetchers";
import Modal from "@/components/dashboard/Modal";
import { Anomaly, Report } from "@/lib/types";
import ReportsTableModal from "@/components/dashboard/ReportsTableModal";
import { markAnomalyAsReviewed } from "@/lib/client/fetchers";
import { getCurrentUserInfo } from "@/lib/client/fetchers";

export default function AnomaliesModal({
  open,
  onClose,
  selectedArea,
}: {
  open: boolean;
  onClose: () => void;
  selectedArea: string | null;
}) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [reportsForAnomaly, setReportsForAnomaly] = useState<Report[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

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

    const filtered = anomalies.filter((a) => {
      const s = search.toLowerCase();

      return (
        (a.title?.toLowerCase() ?? "").includes(s) ||
        (a.area?.toLowerCase() ?? "").includes(s) ||
        (a.status?.toLowerCase() ?? "").includes(s)
      );
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
    <Modal title="🚨 Anomalies Detection System" onClose={onClose}>
      <div className="w-[900px] max-h-[80vh] overflow-y-auto bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4 rounded-lg shadow-lg">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin text-4xl mb-3">⚙️</div>
            <p className="text-gray-600 font-semibold">Loading anomalies...</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-gray-600 font-semibold">No anomalies detected. Great!</p>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-red-500">
              <div className="flex justify-between items-center gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Search by title / area / status..."
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-red-500 focus:outline-none transition-colors font-medium"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="bg-red-100 border-2 border-red-300 rounded-lg px-4 py-2">
                  <span className="text-sm font-bold text-red-700">
                    📍 {filtered.length} found
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
                    <th className="p-3 text-center">📁 Type</th>
                    <th className="p-3 text-left">📝 Description</th>
                    <th className="p-3 text-center">📍 Area</th>
                    <th className="p-3 text-center">📊 Reports</th>
                    <th className="p-3 text-center">✓ Status</th>
                    <th className="p-3 text-center">📅 First Detected</th>
                    <th className="p-3 text-center">⏰ Last Updated</th>
                    <th className="p-3 text-center">⚙️ Actions</th>
                  </tr>
                </thead>
<tbody>
  {filtered.map((a, index) => {
    const metrics = a.metrics ?? {};
    const lastDate = a.lastUpdated;

    return (
      <tr key={a.id} className="border-b hover:bg-red-50 transition-colors">
        <td className="p-3 text-center font-bold text-red-600">{index + 1}</td>

        {/* type icon */}
        <td className="p-3 text-center text-2xl">
          {a.category === "garbage"
            ? "🗑️"
            : a.category === "lighting"
            ? "💡"
            : a.category === "tree"
            ? "🌳"
            : "⚠️"}
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
                alert("❌ User not authenticated. Please log in first.");
                return;
              }

              const isReviewed = !!(a.reviewedBy && a.reviewedBy[safeKey]);

              if (isReviewed) {
                alert("✅ You already reviewed this anomaly");
                return;
              }

              if (confirm("Have you reviewed this anomaly?")) {
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
              return isReviewed ? "✅ Reviewed" : "⏳ Mark as Reviewed";
            })()}
          </button>
        </td>

        {/* first date */}
        <td className="p-3 text-center text-xs text-gray-700">
          {new Date(a.firstDetected).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "2-digit",
          })}
        </td>

        {/* last date */}
        <td className="p-3 text-center text-xs text-gray-700">
          {new Date(a.lastUpdated).toLocaleDateString("en-US", {
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
              setReportsModalOpen(true);
            }}
          >
            🔍 View
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
      {reportsModalOpen && selectedAnomaly && (
        <ReportsTableModal
          open={reportsModalOpen}
          onClose={() => {
            setReportsModalOpen(false);
            // ✅ Refetch anomalies to ensure DB changes are reflected
            (async () => {
              const updated = await fetchAnomalies();
              setAnomalies(updated);
            })();
          }}
          reports={reportsForAnomaly}
          selectedArea={selectedArea}
          onApplyFilters={() => {}}
          title={`Reports for: ${selectedAnomaly.title}`}
          anomalyDetails={selectedAnomaly}
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
