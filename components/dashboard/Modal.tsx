"use client";
import React from "react";

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* מעטפת עיקרית – גמישה לפי התוכן */}
      <div
        className="
          bg-white rounded-lg shadow-xl 
          max-w-[95vw] max-h-[90vh] w-auto h-auto 
          overflow-hidden flex flex-col
        "
      >
        {/* כותרת */}
        {title && (
          <div className="flex justify-between items-center border-b p-4 bg-gray-100">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-red-600 font-bold text-lg hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* תוכן – ניתן לגלילה פנימית */}
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}
