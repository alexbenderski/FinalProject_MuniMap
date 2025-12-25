"use client";
import { useEffect, useState } from "react";

export default function RealtimeClock() {
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  useEffect(() => {
    const updateDateTime = () => {
      const jerusalemTime = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })
      );
      const dateStr = jerusalemTime.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const timeStr = jerusalemTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentDateTime(`${dateStr} | ${timeStr}`);
    };

    updateDateTime(); // Call immediately
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-center mb-4 items-center">
      <div className="bg-white rounded-lg px-4 py-2 shadow text-gray-700 font-mono text-sm flex items-center gap-2">
        <span>🇮🇱 Current Time & Date: </span>
        <span className="font-semibold text-blue-600">{currentDateTime}</span>
      </div>
    </div>
  );
}
