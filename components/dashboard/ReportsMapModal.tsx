"use client";
import { useEffect, useState, useMemo } from "react";
import Modal from "@/components/dashboard/Modal";
import { GoogleMap, Marker, useJsApiLoader,Polygon } from "@react-google-maps/api";
import { Report } from "@/lib/types";
import ReportDetailsModal from "@/components/dashboard/ReportDetailsModal";
import { useCityBoundary } from "@/lib/client/hooks/useCityBoundary";
import { getReportCriticality } from "@/lib/server/sla"; // אם תעביר את הפונקציה לשם
import { SLA_DAYS } from "@/lib/server/sla";

interface ReportsMapModalProps {
  open: boolean;
  onClose: () => void;
  reports: Report[];
  criticality?: string;
  selectedArea: string | null;
  
}

const containerStyle = { width: "1200px", height: "calc(80vh - 60px)" };
const defaultCenter = { lat: 32.794, lng: 34.989 };



export default function ReportsMapModal({ open, onClose, reports, criticality, selectedArea }: ReportsMapModalProps) {


  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { cityBoundary } = useCityBoundary(selectedArea || null, map);

  // ✔️ useMemo prevents infinite loops
  const visibleReports = useMemo(() => {
    return reports.filter((r) => {
      if (r.deleted) return false;
      if (!criticality) return true;
      return getReportCriticality(r) === criticality;
    });
  }, [reports, criticality]);

  // ✔️ safe center update
  useEffect(() => {
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
  }, [visibleReports]);

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

          {visibleReports.map((r) => (
            <Marker
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              title={r.address || r.area || "No address"}
              onClick={() => {
                setSelectedReport(r);
                setDetailsOpen(true);
              }}
              icon={{
                url:
                  r.type === "garbage"
                    ? `/icons/${getReportCriticality(r)}_garbage.png`
                    : r.type === "lighting"
                    ? `/icons/${getReportCriticality(r)}_lighting.png`
                    : r.type === "tree"
                    ? "/icons/tree.png"
                    : "",
                scaledSize: new google.maps.Size(16, 16),
              }}
            />
          ))}
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
