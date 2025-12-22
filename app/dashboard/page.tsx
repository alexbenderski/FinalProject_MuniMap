"use client";

import RequireAuth from "@/components/RequireAuth";
import { useState, useMemo, useEffect } from "react";
import TopBar from "@/components/dashboard/TopBar";
import Modal from "@/components/dashboard/Modal";
import RightSidebar from "@/components/dashboard/RightSidebar";
import BottomBar from "@/components/dashboard/BottomBar";
import MapCanvas from "@/components/dashboard/MapCanvas";
import FiltersModal from "@/components/dashboard/FiltersModal";
import ReportsTableModal from "@/components/dashboard/ReportsTableModal";
import { Report } from "@/lib/types";
import AnomaliesModal from "@/components/dashboard/AnomaliesModal";
import ArchivedReportsModal from "@/components/dashboard/ArchivedReportsModal";
import { useAuth } from "@/components/AuthProvider";
import Image from "next/image";

export default function DashboardPage() {

  // 🔐 Auth
  const { permissions, loading } = useAuth();
  const city = permissions?.city ?? null;

  // 🔹 UI state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [anomListOpen, setAnomListOpen] = useState(false);

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
    return <div className="p-6">Loading dashboard…</div>;
  }

  if (!permissions?.city) {
    return (
      <div className="p-6 text-red-600 font-semibold">
        No city assigned to this user
      </div>
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
      </div>
    </RequireAuth>
  );
}
