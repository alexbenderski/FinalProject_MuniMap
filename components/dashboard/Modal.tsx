"use client";
import React, { useState } from "react";

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, onClose, children }: ModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

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
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-gray-600 font-bold text-lg hover:text-gray-800 transition-colors"
                title={isFullscreen ? "Collapse" : "Fullscreen"}
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

// "use client";
// import React from "react";

// interface ModalProps {
//   title?: string;
//   onClose: () => void;
//   children: React.ReactNode;
// }

// export default function Modal({ title, onClose, children }: ModalProps) {
//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//       <div
//         className="
//           bg-white rounded-lg shadow-xl
//           max-w-[95vw] max-h-[90vh]
//           flex flex-col
//           overflow-hidden
//         "
//       >
//         {title && (
//           <div className="flex justify-between items-center border-b p-4 bg-gray-100">
//             <h2 className="text-lg font-semibold">{title}</h2>
//             <button
//               onClick={onClose}
//               className="text-red-600 font-bold text-lg hover:text-red-800"
//             >
//               ✕
//             </button>
//           </div>
//         )}

//         {/* ⬅️ חשוב: X כן, Y לא */}
//         <div className="flex-1 p-4 overflow-x-auto overflow-y-hidden">
//           {children}
//         </div>
//       </div>
//     </div>
//   );
// }