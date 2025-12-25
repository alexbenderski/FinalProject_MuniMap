"use client";
import { useEffect, useState } from "react";
import { subscribeToAnomalies, subscribeToReports } from "@/lib/client/fetchers";
import { Anomaly, Report } from "@/lib/types";
import AnomalyDetailsModal from "@/components/dashboard/anomalies/AnomalyDetailsModal";
import GeoAnomaliesMapModal from "@/components/dashboard/maps/GeoAnomaliesMapModal";

export default function BottomBar({ onOpenFullList }: { onOpenFullList: () => void }) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [anomalyDetailsOpen, setAnomalyDetailsOpen] = useState(false);
  const [geoMapOpen, setGeoMapOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [reportsForAnomaly, setReportsForAnomaly] = useState<Report[]>([]);

  // ✅ Subscribe to real-time anomalies
  useEffect(() => {
    const unsubscribe = subscribeToAnomalies((data) => {
      // Sort by last updated and limit to 20
      const sorted = [...data].sort((a, b) => b.lastUpdated - a.lastUpdated);
      setAnomalies(sorted.slice(0, 20));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Open anomaly with real-time reports
  const handleOpenAnomaly = async (anomaly: Anomaly) => {
    // Get the latest reports data
    let reportsData: Record<string, Record<string, Omit<Report, "id" | "type">>> = {};

    // One-time fetch to get related reports
    const unsubscribeReports = subscribeToReports((data) => {
      reportsData = data;
      const related: Report[] = [];

      Object.entries(reportsData).forEach(([type, group]) => {
        Object.entries(group as Record<string, Omit<Report, "id" | "type">>).forEach(
          ([id, report]) => {
            if (anomaly.relatedReports.includes(id)) {
              related.push({ ...report, id, type });
            }
          }
        );
      });

      setReportsForAnomaly(related);
    });

    // Only keep the subscription briefly to get initial data
    setTimeout(() => unsubscribeReports(), 100);
    setSelectedAnomaly(anomaly);
    setAnomalyDetailsOpen(true);
  };

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md h-38">
        <div className="mx-auto max-w-3xl px-4 py-2 text-center h-full flex flex-col">
          <h2 className="text-base font-semibold mb-1">abnormality detection:</h2>

          {loading ? (
            <p className="text-gray-500 text-sm">טוען חריגות...</p>
          ) : anomalies.length === 0 ? (
            <p className="text-gray-500 text-sm">אין חריגות להצגה.</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2">
              {anomalies.map((a, index) => (
                <div
                  key={`${a.id}-${index}`}
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

            <div className="flex gap-2 mt-2">
              <button
                onClick={onOpenFullList}
                className="flex-1 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition"
              >
                📋 הצג רשימה מלאה
              </button>
              
              <button
                onClick={() => setGeoMapOpen(true)}
                className="flex-1 bg-purple-500 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-600 transition"
              >
                🌍 Geo Clusters Map
              </button>
            </div>
        </div>
      </footer>

      {/* 🔵 Anomaly Details Modal */}
      {anomalyDetailsOpen && selectedAnomaly && (
        <AnomalyDetailsModal
          open={anomalyDetailsOpen}
          onClose={() => setAnomalyDetailsOpen(false)}
          anomaly={selectedAnomaly}
          reports={reportsForAnomaly}
        />
      )}

      {/* 🌍 Geo Anomalies Overview Map */}
      {geoMapOpen && (
        <GeoAnomaliesMapModal
          open={geoMapOpen}
          onClose={() => setGeoMapOpen(false)}
          anomalies={anomalies}
        />
      )}
    </>
  );
}
