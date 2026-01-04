"use client";
import { useEffect, useState, useRef } from "react";
import { fetchReports } from "@/lib/client/fetchers";
import { Report,FilterStatus} from "@/lib/types";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import Tooltip from "./Tooltip";
import { useLanguage } from "@/lib/i18n";



interface FiltersModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FiltersPayload) => void;
  currentFilters?: FiltersPayload; // Add current filter values
}

export type FiltersPayload = {
  categories: string[];
  location: string;
  status: FilterStatus;
  statusList?: string[]; // Multiple status selection
  mediaOnly: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  criticality?: string;
  criticalityList?: string[]; // Multiple criticality selection
};



export default function FiltersModal({ open, onClose, onApply, currentFilters }: FiltersModalProps) {
  // Modal title: "🔍 Advanced Filters"
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentFilters?.categories || []);
  const [selectedLocation, setSelectedLocation] = useState(currentFilters?.location || "");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(currentFilters?.statusList || []);
  const [mediaOnly, setMediaOnly] = useState(currentFilters?.mediaOnly || false);
  const [dateFrom, setDateFrom] = useState<string | null>(currentFilters?.dateFrom || null);
  const [dateTo, setDateTo] = useState<string | null>(currentFilters?.dateTo || null);
  const [selectedCriticalities, setSelectedCriticalities] = useState<string[]>(currentFilters?.criticalityList || []);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Use ref to store currentFilters without triggering re-renders
  const currentFiltersRef = useRef(currentFilters);
  currentFiltersRef.current = currentFilters;

  const defaultColor = "green";
  const { permissions } = useAuth();
  const city = permissions?.city;
  const { t } = useLanguage();

  const criticalityOptions = [
    { value: "green", labelKey: "criticality.new", color: "bg-green-500" },
    { value: "yellow", labelKey: "criticality.medium", color: "bg-yellow-500" },
    { value: "orange", labelKey: "criticality.old", color: "bg-orange-500" },
    { value: "red", labelKey: "criticality.critical", color: "bg-red-500" },
  ];

  const statusOptions = [
    { value: "open", labelKey: "status.open" },
    { value: "pending", labelKey: "status.pending" },
    { value: "in progress", labelKey: "status.inProgress" },
    { value: "resolved", labelKey: "status.resolved" },
  ];

  useEffect(() => {
    if (!open) return;

    // Restore current filters when modal opens - use ref to avoid dependency
    const filters = currentFiltersRef.current;
    if (filters) {
      setSelectedCategories(filters.categories || []);
      setSelectedLocation(filters.location || "");
      setSelectedStatuses(filters.statusList || []);
      setMediaOnly(filters.mediaOnly || false);
      setDateFrom(filters.dateFrom || null);
      setDateTo(filters.dateTo || null);
      setSelectedCriticalities(filters.criticalityList || []);
    }

    // Always use predefined categories from lib/categories.ts
    setCategories(Array.from(CATEGORIES));

    async function loadFilters() {
      try {
        const data = await fetchReports();
        if (!data) return;

        const areas = new Set<string>();
        const statusesSet = new Set<string>();

      Object.values(data).forEach((group) => {
        Object.values(group as Record<string, Report>).forEach((r) => {
          // ✅ רק אזורים של העיר של המשתמש
          if (r.area === city && r.area) {
            areas.add(r.area);
          }
          if (r.status) {
            statusesSet.add(r.status);
          }
        });
      });

      } catch (err) {
        console.error("Failed to fetch filter data:", err);
      }
    }

    loadFilters();
  }, [open, city]);

  // ✅ Add ESC key listener
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation(); // ← Prevent parent modals from closing
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const getMaxDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMinDate = () => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return oneYearAgo.toISOString().split('T')[0];
  };

  const toggleCategory = (c: string) => {
    console.log("Toggling category:", c);
    setSelectedCategories((prev) => {
      const newSelection = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      console.log("New category selection:", newSelection);
      return newSelection;
    });
  };

  const toggleStatus = (s: string) => {
    console.log("Toggling status:", s);
    setSelectedStatuses((prev) => {
      const newSelection = prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s];
      console.log("New status selection:", newSelection);
      return newSelection;
    });
  };

  const toggleCriticality = (c: string) => {
    console.log("Toggling criticality:", c);
    setSelectedCriticalities((prev) => {
      const newSelection = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      console.log("New criticality selection:", newSelection);
      return newSelection;
    });
  };

  const selectAllCategories = () => setSelectedCategories([...categories]);
  const unselectAllCategories = () => setSelectedCategories([]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-200 rounded-lg p-6 w-[400px] relative shadow-xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-xl font-bold text-red-600"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4 text-center underline">
          {t("filters.title")}
        </h2>

        {/* 💡 Tips Section - Collapsible */}
        <div className="mb-4 border-2 border-blue-300 rounded-lg bg-blue-50">
          <button
            onClick={() => setShowTips(!showTips)}
            className="w-full flex items-center justify-between p-3 hover:bg-blue-100 transition-colors rounded-lg"
          >
            <span className="font-semibold text-blue-900 flex items-center gap-2">
              💡 {t("filters.tipsTitle")}
            </span>
            <span
              className="text-xl text-blue-600 transition-transform duration-300"
              style={{ transform: showTips ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              ▼
            </span>
          </button>

          {showTips && (
            <div className="p-4 space-y-3 border-t border-blue-200">
              <div className="bg-white p-3 rounded-md border-l-4 border-red-500">
                <p className="font-semibold text-red-700 mb-1">🚨 {t("filters.criticalAttention")}</p>
                <p className="text-sm text-gray-700">
                  {t("filters.criticalAttentionDesc")}
                </p>
              </div>

              <div className="bg-white p-3 rounded-md border-l-4 border-orange-500">
                <p className="font-semibold text-orange-700 mb-1">⚠️ {t("filters.delayedProgress")}</p>
                <p className="text-sm text-gray-700">
                  {t("filters.delayedProgressDesc")}
                </p>
              </div>

              <div className="bg-white p-3 rounded-md border-l-4 border-green-500">
                <p className="font-semibold text-green-700 mb-1">✅ {t("filters.performanceTracking")}</p>
                <p className="text-sm text-gray-700">
                  {t("filters.performanceTrackingDesc")}
                </p>
              </div>

              <div className="bg-white p-3 rounded-md border-l-4 border-blue-500">
                <p className="font-semibold text-blue-700 mb-1">📊 {t("filters.trendAnalysis")}</p>
                <p className="text-sm text-gray-700">
                  {t("filters.trendAnalysisDesc")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Categories - Expandable */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="font-semibold flex items-center">
              {t("filters.category")}
              <Tooltip message={t("filters.categoryTooltip")} />
            </label>
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="text-xl text-gray-600 hover:text-gray-800 transition-transform duration-300"
              style={{ transform: showAllCategories ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              ▼
            </button>
          </div>

          {/* Selected Categories Display */}
          {selectedCategories.length > 0 && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md max-h-20 overflow-y-auto">
              <p className="text-xs text-gray-600 mb-1">{t("filters.selected")} ({selectedCategories.length}):</p>
              <div className="flex flex-wrap gap-1">
                {selectedCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="bg-green-300 border border-green-600 rounded-lg px-2 py-1 text-xs hover:bg-green-400 transition-colors"
                  >
                    {t(`categories.${cat}`) || cat} ✕
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expandable Categories List */}
          {showAllCategories && (
            <div className="border rounded-md p-2 bg-white mb-2 max-h-[140px] overflow-y-auto">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={selectAllCategories}
                  className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors"
                >
                  {t("filters.selectAll")}
                </button>
                <button
                  onClick={unselectAllCategories}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                >
                  {t("filters.unselectAll")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`border rounded-lg px-3 py-2 flex items-center gap-2 transition-colors ${
                      selectedCategories.includes(cat)
                        ? "bg-green-300 border-green-600"
                        : "bg-gray-50 hover:bg-gray-100 border-gray-300"
                    }`}
                  >
                    <Image
                      src={`/icons/${defaultColor}_${cat.toLowerCase()}.png`}
                      alt={cat}
                      width={24}
                      height={24}
                      className="w-6 h-6 object-contain"
                      unoptimized
                    />
                    <span className="text-sm">{t(`categories.${cat}`) || CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>



        {/* Status */}
        <div className="mb-3">
          <label className="font-semibold block mb-2">{t("filters.status")}
            <Tooltip message={t("filters.statusTooltip")} />
          </label>

          {/* Status Options */}
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleStatus(option.value)}
                className={`px-3 py-2 rounded border transition-colors ${
                  selectedStatuses.includes(option.value)
                    ? "bg-green-300 border-green-600"
                    : "bg-gray-50 hover:bg-gray-100 border-gray-300"
                }`}
              >
                <span className="text-sm">{t(option.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Criticality filter */}
        <div className="mb-3">
            <label className="font-semibold block mb-2">{t("filters.criticalityLevel")}
            <Tooltip message={t("filters.criticalityTooltip")} />
            </label>

          {/* Criticality Options */}
          <div className="flex flex-wrap gap-2">
            {criticalityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleCriticality(option.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                  selectedCriticalities.includes(option.value)
                    ? "bg-green-300 border-green-600"
                    : "bg-gray-50 hover:bg-gray-100 border-gray-300"
                }`}
              >
                {option.color && (
                  <div className={`w-4 h-4 rounded-full ${option.color}`}></div>
                )}
                <span className="text-sm">{t(option.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="mb-3">
          <div className="flex gap-2">
            <div className="flex flex-col flex-1">
              <label className="font-semibold mb-1 text-sm">{t("common.from")}:</label>
              <input
                type="date"
                className="border rounded px-2 py-1"
                value={dateFrom ?? ""}
                onChange={(e) => setDateFrom(e.target.value || null)}
                min={getMinDate()}
                max={getMaxDate()}
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">Min: {getMinDate()}</p>
            </div>
            <div className="flex flex-col flex-1">
              <label className="font-semibold mb-1 text-sm">{t("common.to")}:</label>
              <input
                type="date"
                className="border rounded px-2 py-1"
                value={dateTo ?? ""}
                onChange={(e) => setDateTo(e.target.value || null)}
                min={getMinDate()}
                max={getMaxDate()}
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">Max: {getMaxDate()}</p>
            </div>
          </div>
          
          {/* Warning when dates are backwards */}
          {dateFrom && dateTo && dateFrom > dateTo && (
            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 rounded text-sm text-yellow-800">
              ⚠️ {t("filters.datesBackwardsWarning") || "Start date is after end date - dates will be auto-swapped when applied"}
            </div>
          )}
        </div>

        {/* Media only */}
        <div className="flex items-center gap-2 mb-4">
          <label className="font-semibold">{t("filters.mediaOnly")}</label>
          <input
            type="checkbox"
            checked={mediaOnly}
            onChange={() => setMediaOnly(!mediaOnly)}
          />
        </div>

        {/* Accept button */}
        <button
          className={`w-full font-bold py-2 rounded transition-colors ${
            selectedCategories.length > 0 && selectedStatuses.length > 0 && selectedCriticalities.length > 0 && dateFrom && dateTo
              ? "bg-green-400 hover:bg-green-500 text-white cursor-pointer"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!(selectedCategories.length > 0 && selectedStatuses.length > 0 && selectedCriticalities.length > 0 && dateFrom && dateTo)}
          onClick={() => {
            console.log("🔍 Filter Accept Button Clicked!");
            console.log("Selected Categories:", selectedCategories);
            console.log("Selected Statuses:", selectedStatuses);
            console.log("Selected Criticalities:", selectedCriticalities);
            console.log("Date From:", dateFrom);
            console.log("Date To:", dateTo);
            
            if (selectedCategories.length > 0 && selectedStatuses.length > 0 && selectedCriticalities.length > 0 && dateFrom && dateTo) {
              // 🔹 Auto-fix: Swap dates if they're backwards (common in RTL mode)
              let finalDateFrom = dateFrom;
              let finalDateTo = dateTo;
              
              if (dateFrom > dateTo) {
                console.warn("⚠️ Dates were backwards - auto-swapping!");
                finalDateFrom = dateTo;
                finalDateTo = dateFrom;
              }
              
              const filters = {
                categories: selectedCategories,
                location: selectedLocation,
                status: selectedStatuses[0] as FilterStatus,
                statusList: selectedStatuses,
                mediaOnly,
                dateFrom: finalDateFrom,
                dateTo: finalDateTo,
                criticality: selectedCriticalities.length > 0 ? selectedCriticalities[0] : "",
                criticalityList: selectedCriticalities,
              };
              console.log("🚀 Applying filters:", filters);
              onApply(filters);
            }
          }}
        >
          {selectedCategories.length === 0 || selectedStatuses.length === 0 || selectedCriticalities.length === 0 || !dateFrom || !dateTo
            ? t("filters.pleaseSelect")
            : t("filters.acceptButton")}
        </button>
      </div>
    </div>
  );
}
