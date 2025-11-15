"use client";
import { useState, useEffect } from "react";
import { fetchCitiesFromLocal } from "@/lib/fetchers";

type City = {
  city: string;
  district: string;
  coordinates: { lat: number; lng: number }[];
};

export default function RegionSelector({
  selectedArea,
  onSelect,
}: {
  selectedArea: string | null;
  onSelect: (city: string) => void;
}) {
  const [regions, setRegions] = useState<Record<string, string[]>>({});
  const [openRegion, setOpenRegion] = useState<string | null>(null);

    useEffect(() => {
    async function fetchData() {
        try {
        const cities: City[] = await fetchCitiesFromLocal();

        // יצירת אובייקט של מחוז -> רשימת ערים
        const grouped: Record<string, string[]> = {};

        cities.forEach((c) => {
            // ננקה שמות מחוזות כפולים או גרסאות שונות
            const district = c.district
            ?.trim()
            .replace(" District", "")
            .replace("מחוז", "")
            .replace(" ", "")
            .toLowerCase();

            if (!district) return;

            // נוודא שקיים key אחד בלבד לכל מחוז
            const normalizedName =
            district === "haifa"
                ? "Haifa District"
                : district === "north"
                ? "North District"
                : district === "center"
                ? "Center District"
                : district === "south"
                ? "South District"
                : district === "jerusalem"
                ? "Jerusalem District"
                : district === "telaviv"
                ? "Tel Aviv District"
                : district === "judeaandsamaria"
                ? "Judea and Samaria"
                : c.district;

            if (!grouped[normalizedName]) grouped[normalizedName] = [];
            if (!grouped[normalizedName].includes(c.city))
            grouped[normalizedName].push(c.city);
        });

        setRegions(grouped);
        } catch (err) {
        console.error("Failed to load cities data:", err);
        }
    }
    fetchData();
    }, []);


  return (
    <div className="space-y-2">
      {Object.entries(regions).map(([district, cities]) => (
        <div key={district} className="border rounded-md overflow-hidden">
          <button
            onClick={() =>
              setOpenRegion(openRegion === district ? null : district)
            }
            className="w-full bg-gray-100 text-left px-3 py-2 font-semibold hover:bg-gray-200"
          >
            {district}
          </button>

          {openRegion === district && (
            <div className="p-2 border-t bg-white">
              <select
                className="w-full border px-2 py-1 rounded-md"
                onChange={(e) => onSelect(e.target.value)}
                value={selectedArea ?? ""}
              >
                <option value="">בחר עיר...</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
