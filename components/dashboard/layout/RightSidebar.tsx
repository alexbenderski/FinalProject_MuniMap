import React, { useState } from "react";
import StatisticsModal from "@/components/dashboard/statistics/StatisticsModal";
import { useAuth } from "@/components/AuthProvider";


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

  // // פונקציה שמוסיפה / מסירה סוג אירוע לפי לחיצה
  // const toggleType = (t: string) =>
  //   setSelectedTypes((prev) =>
  //     prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]// check if t (the new type that selected) is already selected 
  //     // if its in the selectedtypes array(prev.includes(t)),  make array without it (prev.filter((x) => x !== t)) OR add it to the new array ([...prev, t])
  //   );
  const { permissions } = useAuth();

  return (
    <aside className="flex w-[270px] h-auto lg:h-[465px] border-l bg-white flex-col overflow-hidden flex-shrink-0">{
      /* Logo Section */}
      {logoImage && (
        <div className="px-2 py-4 flex justify-center  overflow-hidden  scale-130" >
          <div className="hover:scale-105 transition-transform duration-300 cursor-pointer origin-center ">
            {logoImage}
          </div>
        </div>
      )}

      {/* 🔒 City lock */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 m-3 text-center">
        <div className="text-sm text-blue-800 font-semibold ">
          עירייה
        </div>
        <div className="text-lg font-bold text-blue-900 mt-1 flex items-center justify-center">
          עיריית {permissions?.city}
        </div>
      </div>

          <button
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md mb-2"
        onClick={() => setStatsOpen(true)}
      >
        📊 סטטיסטיקה
      </button>

      {/* המודל עצמו */}
      {statsOpen && (
        <StatisticsModal open={statsOpen} onClose={() => setStatsOpen(false)} city={permissions?.city ?? null} />
      )}

      {/* סיכום הפילטרים */}
      <div className="flex-1 flex flex-col min-h-0 border-t overflow-hidden">
        <div className="font-semibold flex items-center justify-center flex-shrink-0 p-3">
          📊 Selected filters
        </div>
        <ul className="text-sm text-gray-700 space-y-1 overflow-y-auto flex-1 px-3 pb-3">
          {Object.entries(filterSummary).map(([k, v]) => (
            <li key={k}>
              <strong>{k}:</strong> {v}
            </li>
          ))}
        </ul>
      </div>


      {/* בחירת סוג אירוע
    <div className="p-3">
      <div className="font-semibold mb-2">Select option</div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: "garbage", icon: "/icons/garbage.png", label: "Garbage" },
          { key: "light", icon: "/icons/light.png", label: "Light" },
          { key: "tree", icon: "/icons/tree.png", label: "Tree" },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => toggleType(key)}
            className={`flex flex-col items-center rounded-lg border px-3 py-2 transition ${
              selectedTypes.includes(key)
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <img src={icon} alt={label} className="w-6 h-6 mb-1" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div> */}
    </aside>
  );
}
