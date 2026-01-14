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
import SearchByIdModal from "@/components/dashboard/reports/SearchByIdModal";
import { Report } from "@/lib/types";
import AnomaliesModal from "@/components/dashboard/anomalies/AnomaliesModal";
import ArchivedReportsModal from "@/components/dashboard/reports/ArchivedReportsModal";
import { useAuth } from "@/components/AuthProvider";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n";

// 🧪 DEV TOOLS - Remove this import to disable test report generator
import { TestReportGeneratorModal } from "@/lib/dev-tools/report-generator";
import { AnomalyThresholdCalculatorModal } from "@/lib/dev-tools/anomaly-threshold-calculator";
import SimulationPanel from "@/components/dashboard/simulation/SimulationPanel";

export const dynamic = 'force-dynamic';

export default function DashboardPage() {

  // 🔐 Auth
  const { permissions, loading } = useAuth();
  const city = permissions?.city ?? null;
  const { t } = useLanguage();

  // 🔹 UI state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tableViewOpen, setTableViewOpen] = useState(false);
  const [searchByIdOpen, setSearchByIdOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [anomListOpen, setAnomListOpen] = useState(false);

  // 🧪 DEV TOOLS - Test Report Generator state
  const [testGenOpen, setTestGenOpen] = useState(false);
  const [thresholdCalcOpen, setThresholdCalcOpen] = useState(false);
  const [simulationOpen, setSimulationOpen] = useState(false);
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
      media: mediaOnly ? t("filters.mediaOnly") : "—",
      criticality: criticalityList.length > 0
        ? criticalityList.map(c => 
            c === "green" ? t("criticality.new") :
            c === "yellow" ? t("criticality.medium") :
            c === "orange" ? t("criticality.old") : t("criticality.critical")
          ).join(", ")
        : "—",
    }),
    [selectedArea, selectedTypes, dateFrom, dateTo, statusList, mediaOnly, criticalityList, t]
  );

  // ⏳ Guards — רק אחרי כל ה-Hooks
  if (loading) {
    return (
      <RequireAuth>
        <div className="p-6">{t("dashboard.loadingDashboard")}</div>
      </RequireAuth>
    );
  }

  if (!permissions?.city) {
    return (
      <RequireAuth>
        <div className="p-6 text-red-600 font-semibold">
          {t("dashboard.noCityAssigned")}
        </div>
      </RequireAuth>
    );
  }

  // Reset all filters to initial state
  const handleReset = () => {
    setSelectedTypes([]);
    setDateFrom(null);
    setDateTo(null);
    setStatus("all");
    setStatusList([]);
    setMediaOnly(false);
    setCriticality("");
    setCriticalityList([]);
    setFiltersApplied(false);
    setReportsForTable([]);
  };

  // ================================
  // JSX
  // ================================
  return (
    <RequireAuth>
      <div className="flex h-screen flex-col bg-gray-100 text-gray-900 min-w-[600px]">
        <TopBar
          onRefresh={handleReset}
          onOpenFilters={() => setFiltersOpen(true)}
          onOpenTableView={() => setTableViewOpen(true)}
          onOpenSearch={() => setSearchByIdOpen(true)}
          onOpenArchive={() => setArchiveOpen(true)}
          onOpenSimulation={() => setSimulationOpen(true)}
          filtersApplied={filtersApplied}
        />

        <div className="flex flex-row flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-w-[300px] min-h-0">
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
          </div>

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
              console.log("📊 Dashboard onApply received filters:", filters);
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
              console.log("✅ Dashboard filter state updated, modal closed");
            }}
          />

        <BottomBar onOpenFullList={() => setAnomListOpen(true)} />

        {/* 🧪 DEV TOOLS - Test Report Generator Button */}
        {/* HIDDEN
        <button
          onClick={() => setTestGenOpen(true)}
          className="fixed bottom-40 left-4 z-40 px-3 py-2 bg-orange-500 text-white rounded-lg shadow-lg hover:bg-orange-600 font-semibold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap"
          title="Generate Test Reports (QA Tool)"
          style={{ marginRight: "50px" }}
        >
          🧪 <span className="hidden sm:inline">Generate Test Reports</span><span className="sm:hidden">Test Gen</span>
        </button>
        */}

        {/* 🧪 DEV TOOLS - Anomaly Threshold Calculator Button */}
        {/* HIDDEN
        <button
          onClick={() => setThresholdCalcOpen(true)}
          className="fixed bottom-40 left-[calc(1rem+50px)] sm:left-[calc(12rem+50px)] md:left-[calc(14rem+50px)] z-40 px-3 py-2 bg-indigo-500 text-white rounded-lg shadow-lg hover:bg-indigo-600 font-semibold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap mt-14 sm:mt-0"
          title="Calculate Anomaly Thresholds (QA Tool)"
        >
          🎯 <span className="hidden sm:inline">Anomaly Calculator</span><span className="sm:hidden">Calc</span>
        </button>
        */}

        {tableViewOpen && (
          <ReportsTableModal
            open={tableViewOpen}
            onClose={() => setTableViewOpen(false)}
            reports={reportsForTable}
            selectedArea={selectedArea}
            initialFilters={{
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
            onApplyFilters={(filters) => {
              setSelectedTypes(filters.categories);
              setDateFrom(filters.dateFrom);
              setDateTo(filters.dateTo);
              setStatus(filters.status);
              setStatusList(filters.statusList || []);
              setMediaOnly(filters.mediaOnly);
              setCriticality(filters.criticality || "");
              setCriticalityList(filters.criticalityList || []);
              setFiltersApplied(true);
            }}
          />
        )}

        {searchByIdOpen && (
          <SearchByIdModal
            open={searchByIdOpen}
            onClose={() => setSearchByIdOpen(false)}
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
          cityBoundary={cityBoundary}
          defaultCenter={cityCenter}
        />

        {/* 🧪 DEV TOOLS - Report Simulation Panel */}
        <SimulationPanel
          isOpen={simulationOpen}
          onClose={() => setSimulationOpen(false)}
          cityName={permissions?.city ?? ""}
          cityBoundary={cityBoundary.map(p => [p.lat, p.lng])}
        />
      </div>
    </RequireAuth>
  );
}
