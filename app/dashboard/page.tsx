"use client";

import RequireAuth from "@/components/RequireAuth";
import { useState, useMemo } from "react";
import TopBar from "@/components/dashboard/TopBar";
import Modal from "@/components/dashboard/Modal";
import RightSidebar from "@/components/dashboard/RightSidebar";
import BottomBar from "@/components/dashboard/BottomBar";
import MapCanvas from "@/components/dashboard/MapCanvas";
import FiltersModal from "@/components/dashboard/FiltersModal";
import ReportsTableModal from "@/components/dashboard/ReportsTableModal";
import { Report } from "@/lib/types";
import AnomaliesModal from "@/components/dashboard/AnomaliesModal";

export default function DashboardPage() {
  // 🔹 מצבים כלליים של פתיחת חלונות
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [anomListOpen, setAnomListOpen] = useState(false);

  // 🔹 מצבים של פילטרים (למפה ולטבלה)
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "open" | "pending" | "in progress" | "resolved" | "all"
  >("all");
  const [mediaOnly, setMediaOnly] = useState(false);
  const [criticality, setCriticality] = useState<string>(""); // ✅ חדש: רמת קריטיות

  // 🔹 רשימת דיווחים לטבלה
  const [reportsTableOpen, setReportsTableOpen] = useState(false);
  const [reportsForTable, setReportsForTable] = useState<Report[]>([]);

  // 🔹 סיכום קצר של הפילטרים (מופיע בצד ימין)
  const filterSummary = useMemo(
    () => ({
      area: selectedArea ?? "—",
      categories: selectedTypes.length ? selectedTypes.join(", ") : "—",
      dateRange:
        dateFrom || dateTo ? `${dateFrom ?? "—"} – ${dateTo ?? "—"}` : "—",
      status: status === "all" ? "All (no resolved)" : status,
      media: mediaOnly ? "Only with media" : "—",
      criticality:
        criticality === ""
          ? "—"
          : criticality === "green"
          ? "חדש"
          : criticality === "yellow"
          ? "בינוני"
          : criticality === "orange"
          ? "ישן"
          : "קריטי",
    }),
    [selectedArea, selectedTypes, dateFrom, dateTo, status, mediaOnly, criticality]
  );

  const handleRefresh = () => {
    setSelectedArea(null);
    setSelectedTypes([]);
    setDateFrom(null);
    setDateTo(null);
    setStatus("all");
    setMediaOnly(false);
    setCriticality("");
  };

  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
        {/* 🔹 פס עליון */}
        <TopBar
          onRefresh={() => window.location.reload()}
          onOpenFilters={() => setFiltersOpen(true)}
          onOpenSearch={() => {
            if (reportsForTable.length > 0) {
              setSearchOpen(true);
            } else {
              alert("No filtered reports to display — please apply filters first.");
            }
          }}
          onOpenArchive={() => console.log("Archive clicked")}
        />

        {/* 🔹 אזור התוכן המרכזי */}
        <div className="flex flex-1">
          {/* ✅ המפה הראשית */}
          <MapCanvas
            selectedArea={selectedArea}
            selectedTypes={selectedTypes}
            status={status}
            dateFrom={dateFrom}
            dateTo={dateTo}
            mediaOnly={mediaOnly}
            criticality={criticality} // ✅ חדש — נשלח למפה
            onReportsUpdate={(filteredReports) =>
              setReportsForTable(filteredReports)
            }
          />

          {/* 🔹 חלון הפילטרים */}
          <FiltersModal
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            onApply={(filters) => {
              // ✅ עדכון כל הפילטרים ב־state הראשי
              setSelectedArea(filters.location || null);
              setSelectedTypes(filters.categories);
              setDateFrom(filters.dateFrom);
              setDateTo(filters.dateTo);
              setStatus(filters.status);
              setMediaOnly(filters.mediaOnly);
              setCriticality(filters.criticality || ""); // ✅ חדש
              setFiltersOpen(false);
            }}
          />

          {/* 🔹 סיידבר ימני */}
          <RightSidebar
            selectedArea={selectedArea}
            setSelectedArea={setSelectedArea}
            filterSummary={filterSummary}
          />
        </div>

        {/* 🔹 פס תחתון */}
        <BottomBar onOpenFullList={() => setAnomListOpen(true)} />

        {/* 🔹 חלון תוצאות חיפוש (טבלה) */}
        {searchOpen && (
          <ReportsTableModal
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            reports={reportsForTable}
            selectedArea={selectedArea}
            onApplyFilters={(filters) => {
              setSelectedArea(filters.location || null);
              setSelectedTypes(filters.categories);
              setDateFrom(filters.dateFrom);
              setDateTo(filters.dateTo);
              setStatus(filters.status);
              setMediaOnly(filters.mediaOnly);
              setCriticality(filters.criticality || ""); 
            }}

          />
        )}

        {/* 🔹 חלון ארכיון */}
        {archiveOpen && (
          <Modal title="Archived Reports" onClose={() => setArchiveOpen(false)}>
            <p>Archive window</p>
          </Modal>
        )}

        {/* 🔹 רשימת אנומליות */}
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
