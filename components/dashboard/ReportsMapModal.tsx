"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/dashboard/Modal";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Report } from "@/lib/types";
import ReportDetailsModal from "@/components/dashboard/ReportDetailsModal"; // ✅ נייבא את המודל של הדיווח

interface ReportsMapModalProps {
  open: boolean;
  onClose: () => void;
  reports: Report[];
  criticality?: string;
}

const containerStyle = { width: "1200px", height: "calc(80vh - 60px)" };
const defaultCenter = { lat: 32.794, lng: 34.989 }; // חיפה

function getReportCriticality(timestamp: number): "green" | "yellow" | "orange" | "red" {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60 * 24));
  if (diffDays <= 5) return "green";
  if (diffDays <= 14) return "yellow";
  if (diffDays <= 30) return "orange";
  return "red";
}



export default function ReportsMapModal({ open, onClose, reports,criticality }: ReportsMapModalProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  const [center, setCenter] = useState(defaultCenter);

  // ✅ ניהול מצב הדיווח הנבחר
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // ✅ סינון דיווחים שנמחקו
  // const visibleReports = reports.filter((r) => !r.deleted);

    // ✅ סינון דיווחים לפי מחיקה וקריטיות
    const visibleReports = reports.filter((r) => {
      if (r.deleted) return false;

      // אם לא נבחר סינון ספציפי — מציג הכול
      if (!criticality) return true;

      // מחשב את הצבע של הדיווח ובודק אם תואם למה שנבחר
      const reportCrit = getReportCriticality(r.timestamp);
      return reportCrit === criticality;
    });

  // ✅ עדכון מרכז המפה רק כשהוא באמת משתנה (למניעת לולאה אינסופית)
  useEffect(() => {
    if (visibleReports.length === 0) return;

    let newCenter: { lat: number; lng: number };

    if (visibleReports.length === 1) {
      newCenter = { lat: visibleReports[0].lat, lng: visibleReports[0].lng };
    } else {
      const avgLat = visibleReports.reduce((s, r) => s + r.lat, 0) / visibleReports.length;
      const avgLng = visibleReports.reduce((s, r) => s + r.lng, 0) / visibleReports.length;
      newCenter = { lat: avgLat, lng: avgLng };
    }

    // ✅ נעדכן רק אם המרכז באמת השתנה
    if (
      Math.abs(center.lat - newCenter.lat) > 0.00001 ||
      Math.abs(center.lng - newCenter.lng) > 0.00001
    ) {
      setCenter(newCenter);
    }
  }, [visibleReports]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkerClick = (report: Report) => {
    setSelectedReport(report);
    setDetailsOpen(true);
  };

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
        >
          {visibleReports.map((r) => (
            <Marker
              key={r.id ?? `${r.lat}-${r.lng}`}
              position={{ lat: r.lat, lng: r.lng }}
              title={r.address ? r.address : r.area || "לא נמצאה כתובת"}
              onClick={() => handleMarkerClick(r)}
              icon={{
                url:
                  r.type === "garbage"
                    ? "/icons/garbage.png"
                    : r.type === "lighting"
                    ? "/icons/lighting.png"
                    : r.type === "tree"
                    ? "/icons/tree.png"
                    : "",
                scaledSize: new google.maps.Size(40, 40),
              }}
            />
          ))}
        </GoogleMap>
      )}

      {/* ✅ מודל פרטי הדיווח בלחיצה על Marker */}
      {detailsOpen && selectedReport && (
        <ReportDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          report={selectedReport}
          onReportUpdated={(updated) => {
            if (updated.deleted) {
              setDetailsOpen(false);
              setSelectedReport(null);
              return;
            }
            setSelectedReport(updated);
          }}
        />
      )}
    </Modal>
  );
}
