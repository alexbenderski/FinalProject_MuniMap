"use client";
import { useEffect, useState } from "react";
import { fetchAnomalies, fetchReports } from "@/lib/client/fetchers";
import { Anomaly, Report } from "@/lib/types";
import ReportsTableModal from "@/components/dashboard/ReportsTableModal";

export default function BottomBar({ onOpenFullList }: { onOpenFullList: () => void }) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [reportsForAnomaly, setReportsForAnomaly] = useState<Report[]>([]);

  // ✅ טעינת אנומליות מהשרת
  useEffect(() => {
    async function loadAnomalies() {
      setLoading(true);

      const data = await fetchAnomalies();

      // נתונים מגיעים כ-object → ממירים למערך
      const list: Anomaly[] = Object.values(data || {});

      // מיון לפי זמן גילוי
      list.sort((a, b) => b.lastUpdated - a.lastUpdated);

      // מגבילים ל-20 שורות
      setAnomalies(list.slice(0, 20));
      setLoading(false);
    }

    loadAnomalies();
  }, []);

  // ✅ פתיחת אנומליה: משיכת כל הדיווחים הרלוונטיים
  const handleOpenAnomaly = async (anomaly: Anomaly) => {
    const allReportsData = await fetchReports();
    const related: Report[] = [];

    Object.entries(allReportsData).forEach(([type, group]) => {
      Object.entries(group as Record<string, Omit<Report, "id" | "type">>).forEach(
        ([id, report]) => {
          if (anomaly.relatedReports.includes(id)) {
            related.push({ ...report, id, type });
          }
        }
      );
    });

    setReportsForAnomaly(related);
    setSelectedAnomaly(anomaly);
    setReportsModalOpen(true);
  };

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md">
        <div className="mx-auto max-w-3xl px-4 py-2 text-center">
          <h2 className="text-base font-semibold mb-1">❗התראות על חריגות❗</h2>

          {loading ? (
            <p className="text-gray-500 text-sm">טוען חריגות...</p>
          ) : anomalies.length === 0 ? (
            <p className="text-gray-500 text-sm">אין חריגות להצגה.</p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-2">
              {anomalies.map((a) => (
                <div
                  key={a.id}
                  onClick={() => handleOpenAnomaly(a)}
                  className="flex justify-between items-center bg-gray-50 rounded-md px-3 py-1 hover:bg-gray-100 cursor-pointer transition"
                >
                  <div className="flex flex-col text-right">
                    {/* אייקון + כותרת */}
                    <span className="font-medium text-sm">
                      {a.category === "garbage"
                        ? "🗑️"
                        : a.category === "lighting"
                        ? "💡"
                        : a.category === "tree"
                        ? "🌳"
                        : "⚠️"}{" "}
                      {a.title}
                    </span>

                    {/* אזור + מספר דיווחים + חומרה */}
                    <span className="text-xs text-gray-600">
                      אזור: {a.area} • דיווחים: {a.metrics?.currentReports ?? "-"} •{" "}
                      {a.severity === "high"
                        ? "חומרה: גבוהה"
                        : a.severity === "medium"
                        ? "חומרה: בינונית"
                        : "חומרה: נמוכה"}
                    </span>
                  </div>

                  {/* זמן גילוי */}
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(a.lastUpdated).toLocaleString("he-IL", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onOpenFullList}
            className="mt-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition"
          >
            הצג רשימה מלאה
          </button>
        </div>
      </footer>

      {/* 🔵 חלון הצגת הדיווחים הקשורים לאנומליה */}
      {reportsModalOpen && selectedAnomaly && (
        <ReportsTableModal
          open={reportsModalOpen}
          onClose={() => setReportsModalOpen(false)}
          reports={reportsForAnomaly}
          onApplyFilters={() => { } }
          title={`Reports for: ${selectedAnomaly.title}`}
          anomalyDetails={selectedAnomaly} selectedArea={null}        />
      )}
    </>
  );
}
