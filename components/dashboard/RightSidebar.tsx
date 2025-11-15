import React, { useState } from "react";
import RegionSelector from "./RegionSelector";
import { Report, City} from "@/lib/types";
import StatisticsModal from "@/components/dashboard/StatisticsModal";

interface RightSidebarProps {
  selectedArea: string | null;
  setSelectedArea: (a: string | null) => void;
  // selectedTypes: string[];
  // setSelectedTypes: React.Dispatch<React.SetStateAction<string[]>>; 
  //React.Dispatch - a function that recieves a new value and updates the state
  //Dispatch<SetStateAction<T>> - function that recieves new value or function that return new value
  //setSelectedTypes: React.Dispatch<React.SetStateAction<string[]>> -
// This is a function that updates a state of type string[],
// and it can accept either:
// New array directly (e.g. ["tree", "garbage"]),
// Or a function that takes the previous value and returns a new array (e.g. (prev) => [...prev, "light"])
// If you were to try to define only:
// setSelectedTypes: (value: string[]) => void;
// So React would complain about a line like:
// setSelectedTypes((prev) => [...prev, "tree"]);

  filterSummary: Record<string, string>;
}

export default function RightSidebar({ //props of the interface RightSidebarProps (destructuring..)
  selectedArea,
  setSelectedArea,
  // selectedTypes,
  // setSelectedTypes,
  filterSummary,
}: RightSidebarProps) {
  const [statsOpen, setStatsOpen] = useState(false);

  // // פונקציה שמוסיפה / מסירה סוג אירוע לפי לחיצה
  // const toggleType = (t: string) =>
  //   setSelectedTypes((prev) =>
  //     prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]// check if t (the new type that selected) is already selected 
  //     // if its in the selectedtypes array(prev.includes(t)),  make array without it (prev.filter((x) => x !== t)) OR add it to the new array ([...prev, t])
  //   );

  return (
    <aside className="w-[320px] border-l bg-white flex flex-col">
      {/* בחירת אזור */}
    <div className="border-b p-3">
      <div className="font-semibold mb-2">Select area</div>
      <RegionSelector
        selectedArea={selectedArea}
        onSelect={(city) => setSelectedArea(city)}
      />
    </div>
          <button
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md mb-2"
        onClick={() => setStatsOpen(true)}
      >
        📊 סטטיסטיקה
      </button>

      {/* המודל עצמו */}
      {statsOpen && (
        <StatisticsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
      )}

      {/* סיכום הפילטרים */}
      <div className="border-b p-3">
        <div className="font-semibold mb-2 flex items-center gap-2">
          📊 Selected filters
        </div>
        <ul className="text-sm text-gray-700 space-y-1">
          {Object.entries(filterSummary).map(([k, v]) => (
            <li key={k}>
              <strong>{k}:</strong> {v}
            </li>
          ))}
        </ul>
        <div className="mt-3 bg-green-100 rounded-md p-2 text-sm">
          <strong>Selected area:</strong> {selectedArea ?? "—"}
        </div>
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
