"use client";
import { logOut } from "@/lib/client/auth-client";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

export default function TopBar({
  onRefresh,
  onOpenFilters,
  onOpenTableView,
  onOpenSearch,
  onOpenArchive,
  onOpenSimulation,
  filtersApplied = false,
}: {
  onRefresh: () => void;
  onOpenFilters: () => void;
  onOpenTableView: () => void;
  onOpenSearch: () => void;
  onOpenArchive: () => void;
  onOpenSimulation?: () => void;
  filtersApplied?: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleLogout = async () => {
    await logOut();
    router.replace("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-2 sm:px-4 lg:px-6 py-2 shadow-lg w-full overflow-x-hidden">
      <div className="flex items-center justify-between gap-2 max-w-full">
        {/* Left: Title */}
        <div className="flex-shrink min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold tracking-tight truncate">{t("app.title")}</h1>
          <p className="text-[10px] sm:text-xs lg:text-sm text-blue-100 hidden sm:block truncate">{t("app.subtitle")}</p>
        </div>

        {/* Right: Buttons */}
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
        <LanguageSwitcher />
        <button onClick={onRefresh} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 shadow-md text-xs sm:text-sm whitespace-nowrap" title={t("topbar.resetTooltip")}>
          🔄 <span className="hidden md:inline">{t("topbar.refresh")}</span>
        </button>
        <button onClick={onOpenFilters} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 shadow-md text-xs sm:text-sm whitespace-nowrap">
          🧰 <span className="hidden md:inline">{t("topbar.filters")}</span>
        </button>
        <button 
          onClick={onOpenTableView} 
          className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg font-semibold shadow-md text-xs sm:text-sm whitespace-nowrap ${
            filtersApplied 
              ? "bg-white text-blue-700 hover:bg-blue-50 cursor-pointer" 
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!filtersApplied}
          title={!filtersApplied ? t("topbar.tableViewDisabled") : ""}
        >
          📝 <span className="hidden md:inline">{t("topbar.TableView")}</span>
        </button>
        <button onClick={onOpenSearch} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-300 shadow-md text-xs sm:text-sm whitespace-nowrap">
          🔍 <span className="hidden md:inline">{t("topbar.search")}</span>
        </button>
        <button
          onClick={onOpenArchive}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 shadow-md text-xs sm:text-sm whitespace-nowrap hidden sm:flex"
        >
          📋 <span className="hidden lg:inline">{t("topbar.archive")}</span>
        </button>
        {/* 🧪 DEV TOOLS - Simulation Button - HIDDEN */}
        {/* HIDDEN
        {onOpenSimulation && (
          <button
            onClick={onOpenSimulation}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-600 shadow-md text-xs sm:text-sm whitespace-nowrap hidden sm:flex"
            title={t("topbar.simulation") || "Simulation"}
          >
            🧪 <span className="hidden lg:inline">{t("topbar.simulation") || "Simulation"}</span>
          </button>
        )}
        */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 shadow-md text-xs sm:text-sm whitespace-nowrap"
        >
          🚪 <span className="hidden md:inline">{t("topbar.logout")}</span>
        </button>
      </div>
      </div>
    </header>
  );
}
