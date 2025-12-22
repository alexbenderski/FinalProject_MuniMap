"use client";
import { useState, useRef, useEffect } from "react";

export default function Tooltip({ message, position = "top" }: { message: string; position?: "top" | "bottom" }) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTooltipPos({
        top: position === "top" ? rect.top - 50 : rect.bottom + 10,
        left: rect.left + rect.width / 2 - 125, // 250px width / 2 = 125px
      });
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <span
      ref={triggerRef}
      className="relative group cursor-pointer text-blue-600 font-bold ml-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      ?
      {isVisible && (
        <div
          className="fixed bg-gray-900 text-white text-xs rounded-md px-2 py-1 whitespace-pre-line z-[9999] shadow-lg w-[250px]"
          style={{
            top: `${tooltipPos.top}px`,
            left: `${tooltipPos.left}px`,
            pointerEvents: "none",
          }}
        >
          {message}
        </div>
      )}
    </span>
  );
}
