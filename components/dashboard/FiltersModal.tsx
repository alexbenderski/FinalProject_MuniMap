"use client";
import { useEffect, useState } from "react";
import { fetchReports } from "@/lib/client/fetchers";
import Modal from "@/components/dashboard/Modal";
import { Report,FilterStatus} from "@/lib/types";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";



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
  const [locations, setLocations] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentFilters?.categories || []);
  const [selectedLocation, setSelectedLocation] = useState(currentFilters?.location || "");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(currentFilters?.statusList || []);
  const [mediaOnly, setMediaOnly] = useState(currentFilters?.mediaOnly || false);
  const [dateFrom, setDateFrom] = useState<string | null>(currentFilters?.dateFrom || null);
  const [dateTo, setDateTo] = useState<string | null>(currentFilters?.dateTo || null);
  const [selectedCriticalities, setSelectedCriticalities] = useState<string[]>(currentFilters?.criticalityList || []);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const [filters, setFilters] = useState<FiltersPayload & { criticality: string }>({
    categories: [],
    location: "",
    status: "" as FiltersPayload["status"], 
    mediaOnly: false,
    dateFrom: "",
    dateTo: "",
    criticality: "", 
  });

  const defaultColor = "green";
  const { permissions } = useAuth();
  const city = permissions?.city;

  const criticalityOptions = [
    { value: "green", label: "New", color: "bg-green-500" },
    { value: "yellow", label: "Medium", color: "bg-yellow-500" },
    { value: "orange", label: "Old", color: "bg-orange-500" },
    { value: "red", label: "Critical", color: "bg-red-500" },
  ];

  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "pending", label: "Pending" },
    { value: "in progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
  ];

  useEffect(() => {
    if (!open) return;

    // Restore current filters when modal opens
    if (currentFilters) {
      setSelectedCategories(currentFilters.categories || []);
      setSelectedLocation(currentFilters.location || "");
      setSelectedStatuses(currentFilters.statusList || []);
      setMediaOnly(currentFilters.mediaOnly || false);
      setDateFrom(currentFilters.dateFrom || null);
      setDateTo(currentFilters.dateTo || null);
      setSelectedCriticalities(currentFilters.criticalityList || []);
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

        setLocations(Array.from(areas));
        setStatuses(Array.from(statusesSet));
      } catch (err) {
        console.error("Failed to fetch filter data:", err);
      }
    }

    loadFilters();
  }, [open, currentFilters]);

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

  const toggleCategory = (c: string) =>
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const toggleStatus = (s: string) =>
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const toggleCriticality = (c: string) =>
    setSelectedCriticalities((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

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
          Sort reports:
        </h2>

        {/* קטגוריות - מתרחבות */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="font-semibold">Category:</label>
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
              <p className="text-xs text-gray-600 mb-1">Selected ({selectedCategories.length}):</p>
              <div className="flex flex-wrap gap-1">
                {selectedCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="bg-green-300 border border-green-600 rounded-lg px-2 py-1 text-xs hover:bg-green-400 transition-colors"
                  >
                    {cat} ✕
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
                  Select All
                </button>
                <button
                  onClick={unselectAllCategories}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                >
                  Unselect All
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
                    <span className="text-sm">{CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>



        {/* מיקום 
        <div className="mb-3">
          <label className="font-semibold block mb-2">Location:</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">All</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
*/}
        {/* סטטוס */}
        <div className="mb-3">
          <label className="font-semibold block mb-2">Status:</label>

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
                <span className="text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 🔹 סינון לפי קריטיות */}
        <div className="mb-3">
          <label className="font-semibold block mb-2">Criticality Level:</label>

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
                <span className="text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* טווח תאריכים - עם הגבלת שנה אחת */}
        <div className="flex gap-2 mb-3">
          <div className="flex flex-col flex-1">
            <label className="font-semibold mb-1 text-sm">From:</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={dateFrom ?? ""}
              onChange={(e) => setDateFrom(e.target.value || null)}
              min={getMinDate()}
              max={getMaxDate()}
            />
            <p className="text-xs text-gray-500 mt-1">Min: {getMinDate()}</p>
          </div>
          <div className="flex flex-col flex-1">
            <label className="font-semibold mb-1 text-sm">To:</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={dateTo ?? ""}
              onChange={(e) => setDateTo(e.target.value || null)}
              min={getMinDate()}
              max={getMaxDate()}
            />
            <p className="text-xs text-gray-500 mt-1">Max: {getMaxDate()}</p>
          </div>
        </div>

        {/* מדיה בלבד */}
        <div className="flex items-center gap-2 mb-4">
          <label className="font-semibold">Media only</label>
          <input
            type="checkbox"
            checked={mediaOnly}
            onChange={() => setMediaOnly(!mediaOnly)}
          />
        </div>

        {/* כפתור אישור */}
        <button
          className={`w-full font-bold py-2 rounded transition-colors ${
            selectedCategories.length > 0 && selectedStatuses.length > 0 && selectedCriticalities.length > 0 && dateFrom && dateTo
              ? "bg-green-400 hover:bg-green-500 text-white cursor-pointer"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!(selectedCategories.length > 0 && selectedStatuses.length > 0 && selectedCriticalities.length > 0 && dateFrom && dateTo)}
          onClick={() => {
            if (selectedCategories.length > 0 && selectedStatuses.length > 0 && selectedCriticalities.length > 0 && dateFrom && dateTo) {
              onApply({
                categories: selectedCategories,
                location: selectedLocation,
                status: selectedStatuses[0] as FilterStatus,
                statusList: selectedStatuses,
                mediaOnly,
                dateFrom,
                dateTo,
                criticality: selectedCriticalities.length > 0 ? selectedCriticalities[0] : "",
                criticalityList: selectedCriticalities,
              });
            }
          }}
        >
          {selectedCategories.length === 0 || selectedStatuses.length === 0 || selectedCriticalities.length === 0 || !dateFrom || !dateTo
            ? "Please select Category, Status, Criticality Level, and Date Range"
            : "ACCEPT"}
        </button>
      </div>
    </div>
  );
}
