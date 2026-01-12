"use client";
import { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Polygon,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { subscribeToReports } from "@/lib/client/fetchers";
import ReportDetailsModal from "@/components/dashboard/reports/ReportDetailsModal";
import { Report } from "@/lib/types";
import { useCityBoundary } from "@/lib/client/hooks/useCityBoundary";
import { useFilteredReports } from "@/lib/client/hooks/useFilteredReports";
import { getReportCriticalityType } from "@/lib/server/sla";
import { useLanguage } from "@/lib/i18n";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 32.794, lng: 34.989 };

// function getReportCriticality(timestamp: number): "green" | "yellow" | "orange" | "red" {
//   const now = new Date();
//   const diffDays = Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60 * 24));
//   if (diffDays <= 5) return "green";
//   if (diffDays <= 14) return "yellow";
//   if (diffDays <= 30) return "orange";
//   return "red";
// }

export default function MapCanvas({
  city,
  selectedArea,
  selectedTypes,
  status,
  statusList,
  dateFrom,
  dateTo,
  mediaOnly,
  criticality,
  criticalityList,
  filtersApplied,
  onReportsUpdate,
}: {
  selectedArea: string | null;
  selectedTypes: string[];
  status: "open" | "pending" | "in progress" | "resolved" | "all";
  statusList?: string[];
  dateFrom: string | null;
  dateTo: string | null;
  mediaOnly: boolean;
  criticality?: string;
  criticalityList?: string[];
  filtersApplied: boolean;
  onReportsUpdate?: (reports: Report[]) => void;
  city: string | null;
}) {
  console.log("%cMAPCANVAS LOADED", "color:orange;font-size:20px");

  const { t } = useLanguage();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const [cityBoundary, setCityBoundary] = useState<
  //   { lat: number; lng: number }[] | null
  // >(null); //stores array of objects , each object is like a dot. lat,lng
  const { cityBoundary } = useCityBoundary(city, map);

  const { isLoaded } = useJsApiLoader({
    //loading my google maps api key so tha map could work.
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "AIzaSyDMdI_Hjf23zqjMTvUM1VTwn1BlB-tuSfQ",
  });

  // 🔹 Subscribe to real-time reports updates
  // Use refs to avoid re-subscribing when callbacks change
  const cityRef = useRef(city);
  cityRef.current = city;
  
  useEffect(() => {
    if (!city) return;

    const unsubscribe = subscribeToReports((data) => {
      const all: Report[] = [];

      Object.entries(data).forEach(([type, group]) => {
        Object.entries(group as Record<string, Omit<Report, "type" | "id">>).forEach(
          ([id, r]) => {
            all.push({ ...r, type, id });
          }
        );
      });

      // ✅ Filter by city (use ref to avoid dependency)
      const filtered = all.filter((r) => r.area === cityRef.current);
      console.log(`🗺️ MapCanvas: Loaded ${filtered.length} reports for ${cityRef.current}`);
      setReports(filtered);
      
      // Note: onReportsUpdate is called by the second useEffect that watches filteredReports
      // This prevents unnecessary re-renders when only raw reports change but filtered stay same
    });

    return () => unsubscribe();
  }, [city]); // Only re-subscribe when city changes

  // 🔹 Store callback in ref to avoid triggering effect when callback identity changes
  const onReportsUpdateRef = useRef(onReportsUpdate);
  onReportsUpdateRef.current = onReportsUpdate;

  // 🔹 סינון הדיווחים — רק אם יש אזור וגם סוג נבחר

const { filteredReports } = useFilteredReports(reports, {
  selectedArea,
  selectedTypes,
  status,
  statusList,
  dateFrom,
  dateTo,
  mediaOnly,
  criticality,
  criticalityList,
});

const prevReportsRef = useRef<Report[]>([]);

useEffect(() => {
  // ממירים למחרוזת כדי לבדוק אם השתנה משהו באמת
  const prev = JSON.stringify(prevReportsRef.current);
  const next = JSON.stringify(filteredReports);

  if (prev !== next && onReportsUpdateRef.current) {
    onReportsUpdateRef.current(filteredReports);
    prevReportsRef.current = filteredReports;
  }
}, [filteredReports]); // Removed onReportsUpdate from deps - using ref instead


  return (
    <div className="flex-1 relative w-full h-full min-w-0">
      {!isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          {t("dashboard.loadingMap")}
        </div>
      ) : (
        <>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={8}
            onLoad={(m) => setMap(m)}
          >
            {/* מציג רק גבול עיר (אם נבחר אזור) */}
            {cityBoundary && (
              <Polygon
                paths={cityBoundary}
                options={{
                  strokeColor: "blue",
                  strokeOpacity: 0.9,
                  strokeWeight: 2,
                  fillOpacity: 0.1,
                  fillColor: "yellow",
                }}
              />
            )}

            {/* Show filtered reports ONLY when filters are applied */}
            {filtersApplied && filteredReports.map((r) => (
              <Marker
                key={r.id}
                position={{ lat: r.lat, lng: r.lng }}
                title={r.address ? r.address : (r.area || t("map.addressNotFound"))}
                onClick={() => {
                  setSelectedReport(r);
                  setIsModalOpen(true);
                }}
                icon={{
                  url: `/icons/${getReportCriticalityType(r)}_${r.type?.toLowerCase() }.png`,
                  scaledSize: new google.maps.Size(
                    r.type === "animal" || r.type === "maintenance" ? 26 : 22,
                    r.type === "animal" || r.type === "maintenance" ? 26 : 22
                  ),
                }}
              />
            ))}


            {/* חלונית מידע */}
            {selectedReport && (
            <ReportDetailsModal
              open={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              report={selectedReport}
            />
            )}
          </GoogleMap>
          
          {/* Info message when filters not applied */}
          {!filtersApplied && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
              <div className="text-center bg-orange-100 text-orange-800 px-4 py-2 rounded-lg shadow-lg text-sm border-2 border-orange-400">
                <p className="font-semibold">🔍 {t("map.noFiltersApplied") || "No filters applied"}</p>
                <p className="text-xs mt-1">{t("map.applyFiltersToView") || "Apply filters to view reports on the map"}</p>
              </div>
            </div>
          )}
          
          {/* Show count when filters ARE applied */}
          {filtersApplied && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
                <div className="text-center bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
                <p className="font-semibold">📍 {filteredReports.length} {t("map.reportsVisible") || "reports visible"}</p>
                </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
