"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  GoogleMap, //main component that draws the map, working with center,zoom levels and events handle
  Polygon, //draws bounds of some area by the lat/lng
  Marker, //for the icons
  InfoWindow, //show a window pop up when click on the icons
  useJsApiLoader, //special hook that loads the js file of the google maps and ensures that api loaded before the map drawing
} from "@react-google-maps/api";
import { fetchCitiesFromLocal, subscribeToReports } from "@/lib/client/fetchers";
import ReportDetailsModal from "@/components/dashboard/ReportDetailsModal";
import { Report, City } from "@/lib/types";
import { useCityBoundary } from "@/lib/client/hooks/useCityBoundary";
import { useFilteredReports } from "@/lib/client/hooks/useFilteredReports";
import { getReportCriticalityType } from "@/lib/server/sla";
import { SLA_DAYS } from "@/lib/server/sla";
import { CATEGORY_LABELS } from "@/lib/categories";
import { useAuth } from "@/components/AuthProvider";

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

  //useState because this one will changes over time so when we render we want to save the states after the rendering for each.
  const [map, setMap] = useState<google.maps.Map | null>(null); //store map instance. can used to call functions like fitbounds / panTo
  const [reports, setReports] = useState<Report[]>([]); //array of reports from the db
  const [selectedReport, setSelectedReport] = useState<Report | null>(null); //report that was selected on the map
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const [cityBoundary, setCityBoundary] = useState<
  //   { lat: number; lng: number }[] | null
  // >(null); //stores array of objects , each object is like a dot. lat,lng
  const { cityBoundary } = useCityBoundary(city, map);

  const { isLoaded } = useJsApiLoader({
    //loading my google maps api key so tha map could work.
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  // 🔹 Subscribe to real-time reports updates
  useEffect(() => {
    const unsubscribe = subscribeToReports((data) => {
      const all: Report[] = [];

      Object.entries(data).forEach(([type, group]) => {
        Object.entries(group as Record<string, Omit<Report, "type" | "id">>).forEach(
          ([id, r]) => {
            all.push({ ...r, type, id });
          }
        );
      });

      // ✅ Filter by city
      const filtered = all.filter((r) => r.area === city);
      setReports(filtered);

      // Notify parent of report updates
      if (onReportsUpdate) {
        onReportsUpdate(filtered);
      }
    });

    return () => unsubscribe();
  }, [city, onReportsUpdate]);

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

const { permissions } = useAuth();

const prevReportsRef = useRef<Report[]>([]);

useEffect(() => {
  // ממירים למחרוזת כדי לבדוק אם השתנה משהו באמת
  const prev = JSON.stringify(prevReportsRef.current);
  const next = JSON.stringify(filteredReports);

  if (prev !== next && onReportsUpdate) {
    onReportsUpdate(filteredReports);
    prevReportsRef.current = filteredReports;
  }
}, [filteredReports, onReportsUpdate]);


  return (
    <div className="flex-1 relative">
      {!isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          Loading map…
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

            {/* מציג אייקונים רק אם הפילטרים הוחלו */}
            {filtersApplied && filteredReports.map((r) => (
            <Marker
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              title={r.address ? r.address : (r.area || "לא נמצאה כתובת")}
              onClick={() => {
                setSelectedReport(r);
                setIsModalOpen(true);
              }}
              icon={{
                url: `/icons/${getReportCriticalityType(r)}_${r.type?.toLowerCase() || "garbage"}.png`,
                scaledSize: new google.maps.Size(22, 22),
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
          
          {/* Overlay message when filters not applied */}
          {!filtersApplied && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center bg-white/90 p-6 rounded-lg shadow-lg">
                <p className="text-gray-700 text-lg font-semibold">Apply filters to view reports</p>
                <p className="text-gray-500 text-sm mt-2">Select Category, Status, Criticality Level, and Date Range</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
