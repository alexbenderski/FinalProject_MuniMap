"use client";
import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n";

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

// Track the currently active modal
let activeModalCount = 0;

export default function Modal({ title, onClose, children }: ModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalIdRef = useRef<number>(0);
  const { t, isRTL } = useLanguage();

  // Assign a unique ID to this modal instance
  useEffect(() => {
    activeModalCount++;
    modalIdRef.current = activeModalCount;

    return () => {
      activeModalCount--;
    };
  }, []);

  // ✅ Add ESC key listener - only close if this is the topmost modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Only close if this modal is the most recently opened one
        if (modalIdRef.current === activeModalCount) {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Main wrapper */}
      <div
        className={`
          bg-white rounded-lg shadow-xl
          flex flex-col
          overflow-hidden
          transition-all duration-300
          ${isFullscreen 
            ? "w-[98vw] h-[96vh]" 
            : "max-w-[95vw] max-h-[90vh] w-auto"
          }
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex justify-between items-center border-b p-4 bg-gray-100">
            <div className="w-10"></div> {/* Spacer for centering */}
            <h2 className="text-lg font-semibold text-center flex-1">{title}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-gray-600 font-bold text-lg hover:text-gray-800 transition-colors"
                title={isFullscreen ? t("common.collapse") : t("common.fullscreen")}
              >
                {isFullscreen ? "⊡" : "⛶"}
              </button>
              <button
                onClick={onClose}
                className="text-red-600 font-bold text-lg hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
