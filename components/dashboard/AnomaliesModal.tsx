"use client";
import { useEffect, useState } from "react";
import { fetchAnomalies,fetchReports } from "@/lib/client/fetchers";
import Modal from "@/components/dashboard/Modal";
import { Anomaly,Report } from "@/lib/types";
import ReportsTableModal from "@/components/dashboard/ReportsTableModal";
import { markAnomalyAsReviewed } from "@/lib/client/fetchers";
import { getCurrentUserInfo } from "@/lib/client/fetchers";



export default function AnomaliesModal({
   open, onClose,
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
  const [selectedAnomalyTitle, setSelectedAnomalyTitle] = useState<string>("");
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const { email: currentUserEmail, safeKey: currentUserKey } = getCurrentUserInfo();

  useEffect(() => {
    if (!open) return;
    async function loadAnomalies() {
      setLoading(true);
      const data = await fetchAnomalies();
      setAnomalies(data);
      setLoading(false);
    }
    loadAnomalies();
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
  try {
    const result = await markAnomalyAsReviewed(anomaly);

    if (result.alreadyReviewed) {
      alert("You already reviewed this anomaly ✅");
      return;
    }

    setAnomalies((prev) =>
      prev
        .map((a): Anomaly => {
          if (a.id !== anomaly.id) return a;

          const safeEmail =
            result.email?.replace(/\./g, "_") ?? "unknown_user"; // 👈 בטוח גם בלי אימייל
          const safeTimestamp = result.timestamp ?? Date.now(); // 👈 fallback

          return {
            ...a,
            reviewedBy: {
              ...(a.reviewedBy ?? {}) as Record<string, number>,
              [safeEmail]: safeTimestamp,
            },
          };
        }) as Anomaly[] // 👈 TypeScript מרוצה
    );


    alert(`Marked as reviewed by ${result.email}`);
  } catch (err) {
    console.error("Error marking anomaly as reviewed:", err);
    alert("❌ Failed to mark as reviewed. Please try again.");
  }
}




  
  return (
    <Modal title="Anomalies" onClose={onClose}>
      <div className="w-[900px] max-h-[80vh] overflow-y-auto bg-white p-4 rounded-lg shadow">
        {loading ? (
          <p className="text-center text-gray-500 py-4">Loading anomalies...</p>
        ) : anomalies.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No anomalies found.</p>
        ) : (
          <>
            {/* שורת חיפוש */}
            <div className="flex justify-between items-center mb-3">
              <input
                type="text"
                placeholder="חיפוש לפי כותרת / אזור / סטטוס..."
                className="border border-gray-300 rounded-md px-3 py-1 w-1/2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="text-sm text-gray-500">
                {filtered.length} תוצאות
              </span>
            </div>

            {/* טבלה */}
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100 border-b font-semibold sticky top-0 z-10">
                <tr>
                  <th className="p-2 border w-[40px]">#</th>
                  <th className="p-2 border w-[100px] text-center">type</th>
                  <th className="p-2 border text-right">description</th>
                  <th className="p-2 border w-[160px] text-center">area</th>
                  <th className="p-2 border w-[120px] text-center">num of reports</th>
                  <th className="p-2 border w-[120px] text-center">status</th>
                  <th className="p-2 border w-[130px] text-center">first date</th>
                  <th className="p-2 border w-[130px] text-center">last date</th>
                  <th className="p-2 border w-[120px] text-center">actions</th>
                </tr>
              </thead>
<tbody>
  {filtered.map((a, index) => {
    const metrics = a.metrics ?? {};
    const lastDate = a.lastUpdated;


    return (
      <tr key={a.id} className="hover:bg-gray-50 border-b">
        <td className="p-2 text-center font-medium">{index + 1}</td>

        {/* type icon */}
        <td className="p-2 text-center text-lg">
          {a.category === "garbage"
            ? "🗑️"
            : a.category === "lighting"
            ? "💡"
            : a.category === "tree"
            ? "🌳"
            : "⚠️"}
        </td>

        {/* description */}
        <td className="p-2 text-right font-semibold">{a.description}</td>

        {/* area */}
        <td className="p-2 text-center text-gray-700">{a.area}</td>

        {/* num of reports */}
        <td className="p-2 text-center text-gray-700 font-medium">
          {metrics.currentReports ?? a.relatedReports?.length ?? 0} דיווחים
        </td>

        {/* status / reviewed */}
        <td className="p-2 text-center space-y-1 flex flex-col items-center justify-center">
          <button
            onClick={() => {
              const alreadyReviewed =
                !!(currentUserKey && a.reviewedBy?.[currentUserKey]);

              if (alreadyReviewed) {
                alert("כבר סימנת את האנומליה הזו כ־Reviewed ✅");
                return;
              }

              if (confirm("האם אתה בטוח שקראת ובדקת את האנומליה הזו?"))
                handleMarkReviewed(a);
            }}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              currentUserKey && a.reviewedBy?.[currentUserKey]
                ? "bg-green-100 text-green-700 border border-green-300 cursor-default"
                : "bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200"
            }`}
          >
            {currentUserKey && a.reviewedBy?.[currentUserKey]
              ? "Already Reviewed"
              : "Not Reviewed yet"}
          </button>
        </td>

        {/* first date */}
        <td className="p-2 text-center text-gray-600">
          {new Date(a.firstDetected).toLocaleDateString("he-IL", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          })}{" "}
          {new Date(a.firstDetected).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </td>

        {/* last date */}
        <td className="p-2 text-center text-gray-600">
          {new Date(a.lastUpdated).toLocaleDateString("he-IL", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          })}{" "}
          {new Date(a.lastUpdated).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </td>

        {/* actions */}
        <td className="p-2 text-center">
          <button
            className="border border-gray-300 hover:bg-gray-200 rounded-md px-3 py-1 text-sm flex items-center gap-1 mx-auto"
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
            🔍 Open Reports
          </button>
        </td>
      </tr>
    );
  })}
</tbody>
            </table>
          </>
        )}
      </div>
      {reportsModalOpen && selectedAnomaly && (
        <ReportsTableModal
          open={reportsModalOpen}
          onClose={() => setReportsModalOpen(false)}
          reports={reportsForAnomaly}
          selectedArea={selectedArea}
          onApplyFilters={() => {}}
          title={`Reports for: ${selectedAnomaly.title}`}
          anomalyDetails={selectedAnomaly}
          onReviewUpdate={(updated) => {
            // ✅ עדכון גם ברשימת האנומליות הראשית
            setAnomalies((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
            );
          }}
        />
      )}
  
    </Modal>
  );
}
