"use client";
import { useEffect, useState } from "react";
import { fetchReports } from "@/lib/fetchers";
import Modal from "@/components/dashboard/Modal";
import { Report,FilterStatus} from "@/lib/types";
import Image from "next/image";



interface FiltersModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FiltersPayload) => void;
}

export type FiltersPayload = {
  categories: string[];
  location: string;
  status: FilterStatus;
  mediaOnly: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  criticality?: string; // ✅ חדש - שדה אופציונלי

};



export default function FiltersModal({ open, onClose, onApply }: FiltersModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [mediaOnly, setMediaOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectedCriticality, setSelectedCriticality] = useState("");

  const [filters, setFilters] = useState<FiltersPayload & { criticality: string }>({
    categories: [],
    location: "",
    status: "" as FiltersPayload["status"], // 👈 טיפוס נכון
    mediaOnly: false,
    dateFrom: "",
    dateTo: "",
    criticality: "", // 👈 השדה החדש
  });

  const defaultColor = "green";

  useEffect(() => {
    if (!open) return;

    async function loadFilters() {
      try {
        const data = await fetchReports();
        if (!data) return;

        setCategories(Object.keys(data));

        const areas = new Set<string>();
        const statusesSet = new Set<string>();

        Object.values(data).forEach((group) => {
          Object.values(group as Record<string, Report>).forEach((r) => {
            if (r.area) areas.add(r.area);
            if (r.status) statusesSet.add(r.status);
          });
        });

        setLocations(Array.from(areas));
        setStatuses(Array.from(statusesSet));
      } catch (err) {
        console.error("Failed to fetch filter data:", err);
      }
    }

    loadFilters();
  }, [open]);

  if (!open) return null;

  const toggleCategory = (c: string) =>
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-200 rounded-lg p-6 w-[400px] relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-xl font-bold text-red-600"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4 text-center underline">
          Sort reports:
        </h2>

        {/* קטגוריות */}
        <div className="mb-4">
          <label className="font-semibold block mb-2">Category:</label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-white">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`border rounded-lg px-3 py-2 flex items-center gap-2 ${
                  selectedCategories.includes(cat)
                    ? "bg-green-300 border-green-600"
                    : "bg-gray-50 hover:bg-gray-100"
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
                <span className="text-sm">{cat}</span>
              </button>
            ))}
          </div>
        </div>



        {/* מיקום */}
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

        {/* סטטוס */}
        <div className="mb-3">
          <label className="font-semibold block mb-2">Status:</label>
            <select
            className="w-full border rounded px-2 py-1"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            >
            <option value="all">All (no resolved)</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="in progress">In progress</option>
            <option value="resolved">Resolved</option>
            </select>
        </div>

        {/* 🔹 סינון לפי קריטיות */}
        <div>
          <label className="font-semibold">רמת קריטיות:</label>
          <select
            value={selectedCriticality}
            onChange={(e) => setSelectedCriticality(e.target.value)}
            className="border rounded p-1 ml-2"
          >
            <option value="">הכול</option>
            <option value="green">חדש (0–5 ימים)</option>
            <option value="yellow">בינוני (6–14)</option>
            <option value="orange">ישן (15–30)</option>
            <option value="red">קריטי (31+)</option>
          </select>
        </div>

        {/* טווח תאריכים */}
        <div className="flex gap-2 mb-3">
          <div className="flex flex-col flex-1">
            <label className="font-semibold mb-1 text-sm">From:</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={dateFrom ?? ""}
              onChange={(e) => setDateFrom(e.target.value || null)}
            />
          </div>
          <div className="flex flex-col flex-1">
            <label className="font-semibold mb-1 text-sm">To:</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={dateTo ?? ""}
              onChange={(e) => setDateTo(e.target.value || null)}
            />
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
          className="w-full bg-green-400 hover:bg-green-500 text-white font-bold py-2 rounded"
          onClick={() =>
            onApply({
              categories: selectedCategories,
              location: selectedLocation,
              status: (selectedStatus || "all") as "open" | "pending" | "in progress" | "resolved" | "all",
              mediaOnly,
              dateFrom,
              dateTo,
              criticality: selectedCriticality , 

            })
          }
        >
          ACCEPT
        </button>
      </div>
    </div>
  );
}
