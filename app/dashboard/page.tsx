"use client";

import RequireAuth from "@/components/RequireAuth";
import { useState, useMemo, useEffect } from "react";
import TopBar from "@/components/dashboard/layout/TopBar";
import Modal from "@/components/dashboard/common/Modal";
import RightSidebar from "@/components/dashboard/layout/RightSidebar";
import BottomBar from "@/components/dashboard/layout/BottomBar";
import MapCanvas from "@/components/dashboard/maps/MapCanvas";
import FiltersModal from "@/components/dashboard/common/FiltersModal";
import ReportsTableModal from "@/components/dashboard/reports/ReportsTableModal";
import { Report } from "@/lib/types";
import AnomaliesModal from "@/components/dashboard/anomalies/AnomaliesModal";
import ArchivedReportsModal from "@/components/dashboard/reports/ArchivedReportsModal";
import { useAuth } from "@/components/AuthProvider";
import Image from "next/image";

// 🧪 DEV TOOLS - Remove this import to disable test report generator
import { TestReportGeneratorModal } from "@/lib/dev-tools/report-generator";
import { AnomalyThresholdCalculatorModal } from "@/lib/dev-tools/anomaly-threshold-calculator";

export const dynamic = 'force-dynamic';

export default function DashboardPage() {

  // 🔐 Auth
  const { permissions, loading } = useAuth();
  const city = permissions?.city ?? null;

  // 🔹 UI state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [anomListOpen, setAnomListOpen] = useState(false);

  // 🧪 DEV TOOLS - Test Report Generator state
  const [testGenOpen, setTestGenOpen] = useState(false);
  const [thresholdCalcOpen, setThresholdCalcOpen] = useState(false);
  const [cityBoundary, setCityBoundary] = useState<{ lat: number; lng: number }[]>([]);
  const [cityCenter, setCityCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // 🔹 Filters
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "open" | "pending" | "in progress" | "resolved" | "all"
  >("all");
  const [statusList, setStatusList] = useState<string[]>([]);
  const [mediaOnly, setMediaOnly] = useState(false);
  const [criticality, setCriticality] = useState<string>("");
  const [criticalityList, setCriticalityList] = useState<string[]>([]);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // 🔹 Table
  const [reportsForTable, setReportsForTable] = useState<Report[]>([]);

  // 🔒 Lock city from permissions
  useEffect(() => {
    if (!loading && permissions?.city) {
      setSelectedArea(permissions.city);
    }
  }, [loading, permissions]);

  // 🧪 DEV TOOLS - Load city boundary for test generator
  useEffect(() => {
    if (!loading && permissions?.city) {
      fetch("/data/cities_municipal_boundaries.json")
        .then((res) => res.json())
        .then((data: { city: string; coordinates: { lat: number; lng: number }[] }[]) => {
          const found = data.find((c) => c.city === permissions.city);
          if (found && found.coordinates.length > 0) {
            setCityBoundary(found.coordinates);
            // Calculate center
            const avgLat = found.coordinates.reduce((sum, p) => sum + p.lat, 0) / found.coordinates.length;
            const avgLng = found.coordinates.reduce((sum, p) => sum + p.lng, 0) / found.coordinates.length;
            setCityCenter({ lat: avgLat, lng: avgLng });
          }
        })
        .catch(() => {
          // Silently fail - test generator will show error if boundary missing
        });
    }
  }, [loading, permissions]);

  // ✅ useMemo חייב להיות לפני כל return
  const filterSummary = useMemo(
    () => ({
      area: selectedArea ?? "—",
      categories: selectedTypes.length ? selectedTypes.join(", ") : "—",
      dateRange:
        dateFrom || dateTo ? `${dateFrom ?? "—"} – ${dateTo ?? "—"}` : "—",
      status: statusList.length > 0 ? statusList.join(", ") : "—",
      media: mediaOnly ? "Only with media" : "—",
      criticality: criticalityList.length > 0
        ? criticalityList.map(c => 
            c === "green" ? "New" :
            c === "yellow" ? "Medium" :
            c === "orange" ? "Old" : "Critical"
          ).join(", ")
        : "—",
    }),
    [selectedArea, selectedTypes, dateFrom, dateTo, statusList, mediaOnly, criticalityList]
  );

  // ⏳ Guards — רק אחרי כל ה-Hooks
  if (loading) {
    return (
      <RequireAuth>
        <div className="p-6">Loading dashboard…</div>
      </RequireAuth>
    );
  }

  if (!permissions?.city) {
    return (
      <RequireAuth>
        <div className="p-6 text-red-600 font-semibold">
          No city assigned to this user
        </div>
      </RequireAuth>
    );
  }

  // ================================
  // JSX
  // ================================
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
        <TopBar
          onRefresh={() => window.location.reload()}
          onOpenFilters={() => setFiltersOpen(true)}
          onOpenSearch={() =>
            reportsForTable.length
              ? setSearchOpen(true)
              : alert("Apply filters first")
          }
          onOpenArchive={() => setArchiveOpen(true)}
        />

        <div className="flex flex-1">
          <MapCanvas
            city={city}
            selectedArea={selectedArea}
            selectedTypes={selectedTypes}
            status={status}
            statusList={statusList}
            dateFrom={dateFrom}
            dateTo={dateTo}
            mediaOnly={mediaOnly}
            criticality={criticality}
            criticalityList={criticalityList}
            filtersApplied={filtersApplied}
            onReportsUpdate={setReportsForTable}
          />

          <FiltersModal
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            currentFilters={{
              categories: selectedTypes,
              location: selectedArea || "",
              status: status,
              statusList: statusList,
              mediaOnly: mediaOnly,
              dateFrom: dateFrom,
              dateTo: dateTo,
              criticality: criticality,
              criticalityList: criticalityList,
            }}
            onApply={(filters) => {
              setSelectedArea(filters.location || permissions?.city || null);
              setSelectedTypes(filters.categories);
              setDateFrom(filters.dateFrom);
              setDateTo(filters.dateTo);
              setStatus(filters.status);
              setStatusList(filters.statusList || []);
              setMediaOnly(filters.mediaOnly);
              setCriticality(filters.criticality || "");
              setCriticalityList(filters.criticalityList || []);
              setFiltersApplied(true);
              setFiltersOpen(false);
            }}
          />

          <RightSidebar
            selectedArea={selectedArea}
            setSelectedArea={() => {}}
            filterSummary={filterSummary}
            logoImage={
              <Image
                src="/icons/MuniMap_LOGO.png"
                alt="MuniMap Logo"
                width={110}
                height={110}
                className="drop-shadow-lg"
              />
            }
          />
        </div>

        <BottomBar onOpenFullList={() => setAnomListOpen(true)} />

        {/* 🧪 DEV TOOLS - Test Report Generator Button */}
        <button
          onClick={() => setTestGenOpen(true)}
          className="fixed bottom-4 left-4 z-40 px-4 py-2 bg-orange-500 text-white rounded-lg shadow-lg hover:bg-orange-600 font-semibold text-sm flex items-center gap-2"
          title="Generate Test Reports (QA Tool)"
        >
          🧪 Generate Test Reports
        </button>

        {/* 🧪 DEV TOOLS - Anomaly Threshold Calculator Button */}
        <button
          onClick={() => setThresholdCalcOpen(true)}
          className="fixed bottom-4 left-56 z-40 px-4 py-2 bg-indigo-500 text-white rounded-lg shadow-lg hover:bg-indigo-600 font-semibold text-sm flex items-center gap-2"
          title="Calculate Anomaly Thresholds (QA Tool)"
        >
          🎯 Anomaly Calculator
        </button>

        {searchOpen && (
          <ReportsTableModal
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            reports={reportsForTable}
            selectedArea={selectedArea}
            onApplyFilters={(filters) => {
              setSelectedTypes(filters.categories);
              setDateFrom(filters.dateFrom);
              setDateTo(filters.dateTo);
              setStatus(filters.status);
              setMediaOnly(filters.mediaOnly);
              setCriticality(filters.criticality || "");
            }}
          />
        )}

        {archiveOpen && (
          <Modal title="Archived Reports" onClose={() => setArchiveOpen(false)}>
            <ArchivedReportsModal />
          </Modal>
        )}

        {anomListOpen && (
          <AnomaliesModal
            open={anomListOpen}
            onClose={() => setAnomListOpen(false)}
            selectedArea={selectedArea}
          />
        )}

        {/* 🧪 DEV TOOLS - Test Report Generator Modal */}
        <TestReportGeneratorModal
          open={testGenOpen}
          onClose={() => setTestGenOpen(false)}
          cityName={permissions?.city ?? ""}
          cityBoundary={cityBoundary}
          defaultCenter={cityCenter}
        />

        {/* 🧪 DEV TOOLS - Anomaly Threshold Calculator Modal */}
        <AnomalyThresholdCalculatorModal
          open={thresholdCalcOpen}
          onClose={() => setThresholdCalcOpen(false)}
          cityName={permissions?.city ?? ""}
          reportType="All Types"
        />
      </div>
    </RequireAuth>
  );
}
