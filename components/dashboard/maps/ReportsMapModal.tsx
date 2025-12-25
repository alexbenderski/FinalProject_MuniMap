"use client";
import { useEffect, useState, useMemo } from "react";
import Modal from "@/components/dashboard/common/Modal";
import { GoogleMap, Marker, useJsApiLoader, Polygon, Circle } from "@react-google-maps/api";
import { Report, Anomaly } from "@/lib/types";
import ReportDetailsModal from "@/components/dashboard/reports/ReportDetailsModal";
import { useCityBoundary } from "@/lib/client/hooks/useCityBoundary";
import { getReportCriticalityType } from "@/lib/server/sla";

interface ReportsMapModalProps {
  open: boolean;
  onClose: () => void;
  reports: Report[];
  criticality?: string;
  selectedArea: string | null;
  anomalyDetails?: Anomaly;
}

const containerStyle = { width: "1200px", height: "calc(80vh - 60px)" };
const defaultCenter = { lat: 32.794, lng: 34.989 };



export default function ReportsMapModal({ open, onClose, reports, criticality, selectedArea, anomalyDetails }: ReportsMapModalProps) {
console.log("%cRMM LOADED", "color:cyan;font-size:20px");


  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { cityBoundary } = useCityBoundary(selectedArea || null, map);

  // ✔️ useMemo prevents infinite loops
  // const visibleReports = useMemo(() => {
  //   return reports.filter((r) => {
  //     if (r.deleted) return false;
  //     if (!criticality) return true;
  //     return getReportCriticalityType(r) === criticality;
  //   });
  // }, [reports, criticality]);
  console.log("reports length:", reports.length);
  console.log("criticality prop:", criticality);
  const visibleReports = useMemo(() => {
        console.log("visibleReports:");

  return reports.filter((r) => {
    // ➤ אם לא נבחר פילטר — הכל נכנס
    if (!criticality || criticality === "") return true;

    // ➤ מחשבים צבע SLA אמיתי
    const crit = getReportCriticalityType(r);
    console.log("crit:",crit);
    console.log("criticality:",criticality);
    console.log("\n");
    return crit === criticality;

  });
}, [reports, criticality]);

  // ✔️ safe center update
  useEffect(() => {
    // If this is a geo_cluster anomaly, center on its centroid
    if (anomalyDetails && anomalyDetails.type === "geo_cluster" && anomalyDetails.center) {
      const newCenter = { lat: anomalyDetails.center.lat, lng: anomalyDetails.center.lng };
      if (
        Math.abs(center.lat - newCenter.lat) > 0.00001 ||
        Math.abs(center.lng - newCenter.lng) > 0.00001
      ) {
        setCenter(newCenter);
      }
      return;
    }

    // Otherwise, center on visible reports
    if (visibleReports.length === 0) return;

    let newCenter;
    if (visibleReports.length === 1) {
      newCenter = { lat: visibleReports[0].lat, lng: visibleReports[0].lng };
    } else {
      const avgLat = visibleReports.reduce((s, r) => s + r.lat, 0) / visibleReports.length;
      const avgLng = visibleReports.reduce((s, r) => s + r.lng, 0) / visibleReports.length;
      newCenter = { lat: avgLat, lng: avgLng };
    }

    if (
      Math.abs(center.lat - newCenter.lat) > 0.00001 ||
      Math.abs(center.lng - newCenter.lng) > 0.00001
    ) {
      setCenter(newCenter);
    }
  }, [visibleReports, anomalyDetails, center.lat, center.lng]);

  if (!open) return null;

  return (
    <Modal title="Reports Map" onClose={onClose}>
      {!isLoaded ? (
        <div className="p-10 text-center text-gray-500">Loading map...</div>
      ) : (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={visibleReports.length === 1 ? 14 : 12}
          onLoad={(m) => {
            if (!map) setMap(m); // ✔️ prevent infinite rerenders
          }}
        >

          {cityBoundary && (
          <Polygon
            paths={cityBoundary}
            options={{
              strokeColor: "green",
              strokeOpacity: 0.9,
              strokeWeight: 2,
              fillOpacity: 0.1,
              fillColor: "green",
            }}
          />
        )}

          {/* 🔴 Draw circle for geo_cluster anomalies */}
          {anomalyDetails && anomalyDetails.type === "geo_cluster" && anomalyDetails.center && (
            <Circle
              center={{ lat: anomalyDetails.center.lat, lng: anomalyDetails.center.lng }}
              radius={anomalyDetails.metrics.radiusMeters as number || 250}
              options={{
                strokeColor: "#FF0000",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#FF0000",
                fillOpacity: 0.15,
              }}
            />
          )}

          {visibleReports.map((r) => {

            // 🟢 הוספת השורה הזאת ממש כאן:
            const critColor = getReportCriticalityType(r);

            return (
              <Marker
                key={r.id}
                position={{ lat: r.lat, lng: r.lng }}
                title={r.address || r.area || "No address"}
                onClick={() => {
                  setSelectedReport(r);
                  setDetailsOpen(true);
                }}
                icon={{
                  url: `/icons/${critColor}_${r.type}.png`,
                  scaledSize: new google.maps.Size(16, 16),
                }}
              />
            );
          })}
        </GoogleMap>
      )}

      {detailsOpen && selectedReport && (
        <ReportDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          report={selectedReport}
          onReportUpdated={(updated) => {
            if (updated.deleted) {
              setSelectedReport(null);
              setDetailsOpen(false);
            } else {
              setSelectedReport(updated);
            }
          }}
        />
      )}
    </Modal>
  );
}
