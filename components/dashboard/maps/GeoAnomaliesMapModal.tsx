"use client";
import { useEffect, useState, useMemo } from "react";
import Modal from "@/components/dashboard/common/Modal";
import { GoogleMap, Circle, Polygon, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Anomaly, Report } from "@/lib/types";
import { useCityBoundary } from "@/lib/client/hooks/useCityBoundary";
import { subscribeToReports } from "@/lib/client/fetchers";
import ReportDetailsModal from "@/components/dashboard/reports/ReportDetailsModal";
import AnomalyDetailsModal from "@/components/dashboard/anomalies/AnomalyDetailsModal";
import { getReportCriticalityType } from "@/lib/server/sla";

interface GeoAnomaliesMapModalProps {
  open: boolean;
  onClose: () => void;
  anomalies: Anomaly[];
}

const containerStyle = { width: "1200px", height: "calc(80vh - 120px)" };
const defaultCenter = { lat: 32.794, lng: 34.989 };

// Category colors for circles
const CATEGORY_COLORS: Record<string, string> = {
  garbage: "#FF0000",    // Red
  lighting: "#FFA500",   // Orange
  tree: "#00FF00",       // Green

};

export default function GeoAnomaliesMapModal({ open, onClose, anomalies }: GeoAnomaliesMapModalProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "AIzaSyDMdI_Hjf23zqjMTvUM1VTwn1BlB-tuSfQ",
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showReports, setShowReports] = useState(false);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [anomalyDetailsOpen, setAnomalyDetailsOpen] = useState(false);

  // Fetch reports for displaying inside circles
  useEffect(() => {
    if (!open) return;
    const unsubscribe = subscribeToReports((data) => {
      const reports: Report[] = [];
      Object.entries(data).forEach(([type, group]) => {
        Object.entries(group as Record<string, Omit<Report, "id" | "type">>).forEach(
          ([id, report]) => {
            reports.push({ ...report, id, type });
          }
        );
      });
      setAllReports(reports);
    });
    return () => unsubscribe();
  }, [open]);
  
  // Extract unique categories from geo_cluster anomalies
  const geoAnomalies = anomalies.filter(a => a.type === "geo_cluster" && a.center);
  const availableCategories = Array.from(new Set(geoAnomalies.map(a => a.category)));

  // Filter anomalies based on selected categories - empty selection means show nothing
  const filteredAnomalies = selectedCategories.length === 0 
    ? [] 
    : geoAnomalies.filter(a => selectedCategories.includes(a.category));

  // Determine the most common city area for boundary display
  const selectedArea = useMemo(() => {
    if (geoAnomalies.length === 0) return null;
    const areaCounts = new Map<string, number>();
    geoAnomalies.forEach(a => {
      const count = areaCounts.get(a.area) || 0;
      areaCounts.set(a.area, count + 1);
    });
    return Array.from(areaCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [geoAnomalies]);

  const { cityBoundary } = useCityBoundary(selectedArea, map);

  // Calculate center based on filtered anomalies
  const [center, setCenter] = useState(defaultCenter);

  useEffect(() => {
    if (filteredAnomalies.length === 0) {
      setCenter(defaultCenter);
      return;
    }

    const avgLat = filteredAnomalies.reduce((sum, a) => sum + (a.center?.lat || 0), 0) / filteredAnomalies.length;
    const avgLng = filteredAnomalies.reduce((sum, a) => sum + (a.center?.lng || 0), 0) / filteredAnomalies.length;
    
    // Only update if the center actually changed significantly
    if (Math.abs(center.lat - avgLat) > 0.001 || Math.abs(center.lng - avgLng) > 0.001) {
      setCenter({ lat: avgLat, lng: avgLng });
    }
  }, [filteredAnomalies.length, selectedCategories.length]); // Depend on lengths to trigger re-render // Depend on selected categories string instead of filtered array

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      const newCategories = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];
      return newCategories;
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories([...availableCategories]);
  };

  const unselectAllCategories = () => {
    setSelectedCategories([]);
  };

  // Get reports that belong to filtered anomalies
  const reportsInClusters = useMemo(() => {
    if (!showReports || filteredAnomalies.length === 0) return [];
    const relatedReportIds = new Set<string>();
    filteredAnomalies.forEach(anomaly => {
      if (anomaly.relatedReports && Array.isArray(anomaly.relatedReports)) {
        anomaly.relatedReports.forEach(id => relatedReportIds.add(id));
      }
    });
    console.log('Related report IDs:', Array.from(relatedReportIds));
    const filtered = allReports.filter(r => r.id && relatedReportIds.has(r.id));
    console.log('Filtered reports:', filtered.length);
    return filtered;
  }, [showReports, filteredAnomalies, allReports]);

  if (!open) return null;

  return (
    <Modal title="🌍 Geo Cluster Anomalies Overview" onClose={onClose}>
      <div className="w-[1200px]">
        {/* Category Filter Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg shadow-md mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-700">🎯 Filter by Category:</h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllCategories}
                className="px-3 py-1 bg-green-500 text-white rounded-md text-xs hover:bg-green-600 transition font-semibold"
              >
                ✓ Select All
              </button>
              <button
                onClick={unselectAllCategories}
                className="px-3 py-1 bg-gray-500 text-white rounded-md text-xs hover:bg-gray-600 transition font-semibold"
              >
                ✗ Unselect All
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map(category => {
              const isSelected = selectedCategories.includes(category);
              const color = CATEGORY_COLORS[category] || "#808080";
              
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border-2 ${
                    isSelected
                      ? "shadow-lg scale-105"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: isSelected ? color : "#f0f0f0",
                    borderColor: color,
                    color: isSelected ? "#fff" : "#333",
                  }}
                >
                  {category === "garbage" ? "🗑️" : 
                   category === "lighting" ? "💡" : 
                   category === "tree" ? "🌳" : 
                   "⚠️"} {category.toUpperCase()}
                </button>
              );
            })}
          </div>
          
          <div className="mt-3 text-xs text-gray-600">
            {selectedCategories.length === 0 ? (
              <span className="text-orange-600 font-semibold">⚠️ Please select at least one category to view clusters</span>
            ) : (
              <>Showing <span className="font-bold text-blue-600">{filteredAnomalies.length}</span> of {geoAnomalies.length} geo clusters</>
            )}
          </div>
        </div>

        {/* Show Reports Toggle */}
        <div className="mb-3 bg-white p-3 rounded-lg shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-semibold text-gray-700">📍 Display Options:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showReports}
                onChange={(e) => setShowReports(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Reports Inside Clusters</span>
            </label>
          </div>
          <div className="text-xs text-gray-600 space-y-1 ml-6">
            <div>• <strong>For anomaly details:</strong> Click on the colored circle area</div>
            <div>• <strong>For report details:</strong> Click individually on each report marker</div>
          </div>
        </div>

        {/* Map Section */}
        {!isLoaded ? (
          <div className="p-10 text-center text-gray-500">Loading map...</div>
        ) : (
          <GoogleMap
            key={`map-${selectedCategories.join('-')}-${showReports}`}
            mapContainerStyle={containerStyle}
            center={center}
            zoom={12}
            onLoad={(m) => setMap(m)}
          >
            {cityBoundary && (
              <Polygon
                paths={cityBoundary}
                options={{
                  strokeColor: "#00AA00",
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillOpacity: 0.05,
                  fillColor: "#00AA00",
                }}
              />
            )}

            {filteredAnomalies.map((anomaly) => {
              if (!anomaly.center) return null;
              
              const color = CATEGORY_COLORS[anomaly.category] || "#808080";
              const radius = (anomaly.metrics && typeof anomaly.metrics === 'object' && 'radiusMeters' in anomaly.metrics ? (anomaly.metrics as Record<string, unknown>).radiusMeters as number : null) || 250;


              return (
                <Circle
                  key={anomaly.id}
                  center={{ lat: anomaly.center.lat, lng: anomaly.center.lng }}
                  radius={radius}
                  options={{
                    strokeColor: color,
                    strokeOpacity: 0.9,
                    strokeWeight: 3,
                    fillColor: color,
                    fillOpacity: 0.25,
                  }}
                  onClick={() => {
                    setSelectedAnomaly(anomaly);
                    setAnomalyDetailsOpen(true);
                  }}
                />
              );
            })}

            {/* Report Markers */}
            {showReports && reportsInClusters.map((report) => {
              if (!report.lat || !report.lng || report.deleted) return null;
              console.log('Rendering report marker:', report.id, report.type);
              const critColor = getReportCriticalityType(report);
              return (
                <Marker
                  key={`report-${report.id}`}
                  position={{ lat: report.lat, lng: report.lng }}
                  icon={{
                    url: `/icons/${critColor}_${report.type}.png`,
                    scaledSize: new google.maps.Size(16, 16),
                  }}
                  title={`${report.type} - ${report.status}`}
                  onClick={() => {
                    setSelectedReport(report);
                    setDetailsOpen(true);
                  }}
                />
              );
            })}
          </GoogleMap>
        )}

        {/* Legend */}
        <div className="mt-4 bg-gray-50 p-3 rounded-lg">
          <h4 className="text-xs font-bold text-gray-700 mb-2">Legend:</h4>
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
              <div key={category} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2"
                  style={{ backgroundColor: color, borderColor: color }}
                />
                <span className="text-gray-700 capitalize">{category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Details Modal */}
      {detailsOpen && selectedReport && (
        <ReportDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          report={selectedReport}
          onReportUpdated={(updated) => {
            if (updated.deleted) {
              setSelectedReport(null);
              setDetailsOpen(false);
              // Refresh reports list
              setAllReports(prev => prev.filter(r => r.id !== updated.id));
            } else {
              setSelectedReport(updated);
              // Update in reports list
              setAllReports(prev => prev.map(r => r.id === updated.id ? updated : r));
            }
          }}
        />
      )}

      {/* Anomaly Details Modal */}
      {anomalyDetailsOpen && selectedAnomaly && (
        <AnomalyDetailsModal
          open={anomalyDetailsOpen}
          onClose={() => setAnomalyDetailsOpen(false)}
          anomaly={selectedAnomaly}
          reports={allReports.filter(r => 
            selectedAnomaly.relatedReports?.includes(r.id ?? "")
          )}
        />
      )}
    </Modal>
  );
}
