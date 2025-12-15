// "use client";
// import { useState, useEffect } from "react";
// import { fetchCitiesFromLocal } from "@/lib/client/fetchers";
// import { useAuth } from "../AuthProvider";

// type City = {
//   city: string;
//   district: string;
//   coordinates: { lat: number; lng: number }[];
// };

// export default function RegionSelector({
//   selectedArea,
//   onSelect,
// }: {
//   selectedArea: string | null;
//   onSelect: (city: string, district: string) => void;
// }) {
//   const [regions, setRegions] = useState<Record<string, string[]>>({});
//   const [step, setStep] = useState<"closed" | "district" | "city">("closed");
//   const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
//   const normalizeDistrict = (d: string) => {
//     const key = d.trim().toLowerCase();

//     if (key === "haifa" || key === "haifdistrict") return "Haifa District";
//     if (key === "north" || key === "nortdistrict") return "North District";
//     if (key === "center") return "Center District";
//     if (key === "south") return "South District";
//     if (key === "jerusalem") return "Jerusalem District";
//     if (key === "tel aviv") return "Tel Aviv District";

//     return d; // default
//   };
// const { permissions } = useAuth();
// const allowedDistrict = permissions?.district;

// useEffect(() => {
//   async function fetchData() {
//     const cities: City[] = await fetchCitiesFromLocal();
//     const grouped: Record<string, string[]> = {};

//     cities.forEach((c) => {
//       const district = normalizeDistrict(c.district);

//       if (!grouped[district]) grouped[district] = [];
//       if (!grouped[district].includes(c.city))
//         grouped[district].push(c.city);
//     });

//     // 🔥 רשימת מחוזות מותרים
//     // const allowedDistricts = [
//     //   "Haifa District",
//     //   "North District",
//     //   "Center District",
//     //   "South District",
//     //   "Tel Aviv District",
//     //   "Jerusalem District",
//     // ];

//     // 🔥 מסננים החוצה "Judea and Samaria" ומחוזות שאינם רצויים
//     const cleaned = Object.fromEntries(
//       Object.entries(regions).filter(([district]) =>
//         district === allowedDistrict
//       )
//     );

//     setRegions(cleaned);
//   }
//   fetchData();
// }, []);





//   // 🔹 מסתיר הכל ונותן מסך נקי אחרי בחירה
//   if (selectedArea && step === "closed") {
//     return (
//       <div>
//         <button
//           className="w-full border rounded-md px-3 py-2 bg-gray-100 text-left"
//           onClick={() => setStep("district")}
//         >
//           אזור נבחר: {selectedArea}
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-2">
//       {/* כפתור פתיחה */}
//       {step === "closed" && (
//         <button
//           className="w-full border rounded-md px-3 py-2 bg-gray-100 text-left"
//           onClick={() => setStep("district")}
//         >
//           בחר מחוז ואזור ▼
//         </button>
//       )}

//       {/* שלב 1 – בחירת מחוז */}
//       {step === "district" && (
//         <div className="space-y-2">
//           <select
//             className="w-full border px-2 py-2 rounded-md"
//             onChange={(e) => {
//               const district = e.target.value;
//               setSelectedDistrict(district);
//               setStep("city");
//             }}
//             defaultValue=""
//           >
//             <option value="" disabled>
//               בחר מחוז...
//             </option>

//             {Object.keys(regions).map((d) => (
//               <option key={d} value={d}>
//                 {d}
//               </option>
//             ))}
//           </select>
//         </div>
//       )}

//       {/* שלב 2 – בחירת עיר */}
//       {step === "city" && selectedDistrict && (
//         <div className="space-y-2">
//           <select
//             className="w-full border px-2 py-2 rounded-md"
//             onChange={(e) => {
//               const city = e.target.value;
//               onSelect(city, selectedDistrict);
//               setStep("closed"); // חוזרים לתצוגה מצומצמת
//             }}
//             defaultValue=""
//           >
//             <option value="" disabled>
//               בחר עיר במחוז {selectedDistrict}...
//             </option>

//             {regions[selectedDistrict].map((city) => (
//               <option key={city} value={city}>
//                 {city}
//               </option>
//             ))}
//           </select>
//         </div>
//       )}
//     </div>
//   );
// }


"use client";
import { useState, useEffect } from "react";
import { fetchCitiesFromLocal } from "@/lib/client/fetchers";
import { useAuth } from "@/components/AuthProvider"; // ← נוספה שורה זו

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
onSelect: (city: string, district: string) => void
}) {
  const [regions, setRegions] = useState<Record<string, string[]>>({});
  const [openRegion, setOpenRegion] = useState<string | null>(null);

  const { permissions } = useAuth();    // ← נוספה שורה זו
  const allowedDistrict = permissions?.district ?? null; // ← וגם זו

  useEffect(() => {
    async function fetchData() {
      try {
        const cities: City[] = await fetchCitiesFromLocal();

        const grouped: Record<string, string[]> = {};

        cities.forEach((c) => {
          const district = c.district
            ?.trim()
            .replace(" District", "")
            .replace("מחוז", "")
            .replace(" ", "")
            .toLowerCase();

          if (!district) return;

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

      {Object.entries(regions)
        .filter(([district]) => !allowedDistrict || district === allowedDistrict) // ← סינון המחוז כאן
        .map(([district, cities]) => (
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
                  onChange={(e) => onSelect(e.target.value, district)}
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
