import React, { useState } from "react";
import StatisticsModal from "@/components/dashboard/statistics/StatisticsModal";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";


interface RightSidebarProps {
  selectedArea: string | null;
  setSelectedArea: (a: string | null) => void;
  filterSummary: Record<string, string>;
  logoImage?: React.ReactNode;
}

export default function RightSidebar({
  filterSummary,
  logoImage,
}: RightSidebarProps) {
  const [statsOpen, setStatsOpen] = useState(false);
  const { t, isRTL } = useLanguage();
  const { permissions } = useAuth();

  return (
    <aside className={`flex w-[270px] h-full max-h-full bg-white flex-col overflow-hidden flex-shrink-0 ${isRTL ? "border-r" : "border-l"}`}>
      {/* Scrollable content container */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {/* Logo Section */}
        {logoImage && (
          <div className="px-2 py-4 flex justify-center overflow-hidden scale-130 flex-shrink-0">
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer origin-center">
              {logoImage}
            </div>
          </div>
        )}

        {/* 🔒 City lock */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 m-3 text-center flex-shrink-0">
          <div className="text-sm text-blue-800 font-semibold">
            {t("sidebar.municipality")}
          </div>
          <div className="text-lg font-bold text-blue-900 mt-1 flex items-center justify-center">
            {t("sidebar.municipalityOf")} {permissions?.city}
          </div>
        </div>

        <button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md mb-2 mx-3 flex-shrink-0"
          onClick={() => setStatsOpen(true)}
          style={{ width: "calc(100% - 1.5rem)" }}
        >
          📊 {t("sidebar.statistics")}
        </button>

        {/* Modal */}
        {statsOpen && (
          <StatisticsModal open={statsOpen} onClose={() => setStatsOpen(false)} city={permissions?.city ?? null} />
        )}

        {/* Filter summary */}
        <div className="flex-1 flex flex-col min-h-0 border-t">
          <div className="font-semibold flex items-center justify-center flex-shrink-0 p-3">
            📊 {t("sidebar.selectedFilters")}
          </div>
          <ul className="text-sm text-gray-700 space-y-1 overflow-y-auto flex-1 px-3 pb-3">
            {Object.entries(filterSummary).map(([k, v]) => (
              <li key={k}>
                <strong>{t(`sidebar.${k}`) || k}:</strong> {v}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
