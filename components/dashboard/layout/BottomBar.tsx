"use client";
import { useEffect, useState } from "react";
import { subscribeToAnomalies, subscribeToReports } from "@/lib/client/fetchers";
import { Anomaly, Report } from "@/lib/types";
import AnomalyDetailsModal from "@/components/dashboard/anomalies/AnomalyDetailsModal";
import GeoAnomaliesMapModal from "@/components/dashboard/maps/GeoAnomaliesMapModal";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/components/AuthProvider";

export default function BottomBar({ onOpenFullList }: { onOpenFullList: () => void }) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [anomalyDetailsOpen, setAnomalyDetailsOpen] = useState(false);
  const [geoMapOpen, setGeoMapOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [reportsForAnomaly, setReportsForAnomaly] = useState<Report[]>([]);
  const { t, language } = useLanguage();
  const { permissions } = useAuth();
  const userCity = permissions?.city || null;

  // ✅ Subscribe to real-time anomalies
  useEffect(() => {
    const unsubscribe = subscribeToAnomalies((data) => {
      // ✅ Filter by user's city
      const filteredData = userCity 
        ? data.filter(a => a.area === userCity)
        : data;
      
      // Sort by last updated and limit to 20
      const sorted = [...filteredData].sort((a, b) => b.lastUpdated - a.lastUpdated);
      setAnomalies(sorted.slice(0, 20));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userCity]);

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
      <footer className="bg-blue-50 border-t shadow-md w-full flex-shrink-0 z-30 overflow-x-auto">
        {/* Single row: Header | List | Buttons - scrollable on mobile */}
        <div className="flex flex-row items-start justify-center gap-10 px-4 sm:px-4 pt-2 pb-8 py-12 min-w-max">
          {/* Left: Header */}
          <div className="flex-shrink-0">
            <h2 className="text-3xl sm:text-lg md:text-xl font-bold text-blue-800 whitespace-nowrap flex items-center gap-2">
            ⚠️<span>{t("anomalies.abnormalityDetection")}⚠️</span>
            </h2>
          </div>

          {/* Center: Anomalies list - constrained width */}
          <div className="w-[700px] sm:w-[500px] min-w-0  ">
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <p className="text-gray-500 text-xs sm:text-sm">{t("anomalies.loadingAnomalies")}</p>
              </div>
            ) : anomalies.length === 0 ? (
              <div className="flex items-center justify-center h-24">
                <p className="text-gray-500 text-xs sm:text-sm">{t("anomalies.noAnomalies")}</p>
              </div>
            ) : (
              <div className="h-24 overflow-y-auto px-2 space-y-2 rounded-md border border-gray-200 bg-gray-50">
                {anomalies.map((a, index) => (
                <div
                  key={`${a.id}-${index}`}
                  onClick={() => handleOpenAnomaly(a)}
                  className="flex justify-between items-center bg-white rounded-md px-2 sm:px-3 py-2 hover:bg-blue-50 cursor-pointer transition shadow-sm border border-gray-100"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                  {/* Icon + Title */}
                  <span className="font-medium text-xs sm:text-sm truncate">
                    {a.category === "garbage"
                    ? "🗑️"
                    : a.category === "lighting"
                    ? "💡"
                    : a.category === "tree"
                    ? "🌳"
                    : a.category === "hazard"
                    ? "⚠️"
                    : a.category === "animal"
                    ? "🐾"
                    : a.category === "maintenance"
                    ? "🔧"
                    : a.category === "pest"
                    ? "🐛"
                    : "⚠️"}{" "}
                    {a.title}
                  </span>

                  {/* Area + Reports count + Severity */}
                  <span className="text-[10px] sm:text-xs text-gray-600 truncate">
                    {t("anomalies.area")}: {a.area} • {t("anomalies.reportsCount")}: {a.metrics?.currentReports ?? "-"} •{" "}
                    {a.severity === "high"
                    ? t("anomalies.severityHigh")
                    : a.severity === "medium"
                    ? t("anomalies.severityMedium")
                    : t("anomalies.severityLow")}
                  </span>
                  </div>

                  {/* Detection time */}
                  <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap ms-2 sm:ms-3 flex-shrink-0">
                  {new Date(a.lastUpdated).toLocaleString(language === "he" ? "he-IL" : "en-US", {
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
          </div>

          {/* Right: Buttons in vertical stack */}
          <div className="flex flex-col gap-2 justify-center flex-shrink-0">
            <button
              onClick={onOpenFullList}
              className="bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 transition shadow-md flex items-center justify-center gap-1 sm:gap-2 min-h-[40px] touch-manipulation whitespace-nowrap"
            >
              📋 <span>{t("anomalies.fullList")}</span>
            </button>
            
            <button
              onClick={() => setGeoMapOpen(true)}
              className="bg-purple-500 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold hover:bg-purple-600 active:bg-purple-700 transition shadow-md flex items-center justify-center gap-1 sm:gap-2 min-h-[40px] touch-manipulation whitespace-nowrap"
            >
              🌍 <span className="hidden sm:inline">{t("anomalies.geoClustersMap")}</span><span className="sm:hidden">{t("anomalies.map")}</span>
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
