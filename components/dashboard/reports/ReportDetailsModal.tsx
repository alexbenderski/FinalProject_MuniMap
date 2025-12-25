"use client";
import React, { useEffect, useState } from "react";
import { Report,FilterStatus } from "@/lib/types";
import { updateReportInDB,softDeleteReportInDB } from "@/lib/client/fetchers";
import { getReportImages } from "@/lib/client/storage";
import Image from "next/image";
import ImageViewerModal from "../common/ImageViewerModal";



const STATUS_FLOW = ["open", "pending", "in progress", "resolved"] as const;
type ReportStatus = typeof STATUS_FLOW[number];


interface ReportDetailsModalProps {
  open: boolean;
  onClose: () => void;
  report: Report | null;
  onReportUpdated?: (updated: Report) => void; // ✅ נוסיף callback לעדכון המסך
}



//
// async function uploadImage(file: File, reportId: string) {
//   // צור reference ב־Storage
//   const storageRef = ref(storage, `reports/${reportId}/${file.name}`);

//   // העלה את הקובץ
//   await uploadBytes(storageRef, file);

//   // קבל URL ציבורי/מוגן
//   const url = await getDownloadURL(storageRef);

//   return url; // זה מה שתשמור במסד הנתונים בשדה imageUrl
// }



export default function ReportDetailsModal({
  open,
  onClose,
  report,
  onReportUpdated,
}: ReportDetailsModalProps) {
  const [localReport, setLocalReport] = useState<Report | null>(report);
  const [confirmAction, setConfirmAction] = useState<null | "delete" | "update">(null);
  const [images, setImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    useEffect(() => {
    setLocalReport(report ?? null);
    
    // Fetch images when report changes
    if (report?.id) {
      setLoadingImages(true);
      getReportImages(report.id)
        .then((urls) => {
          setImages(urls);
        })
        .catch((err) => {
          console.error("Failed to load images:", err);
          setImages([]);
        })
        .finally(() => {
          setLoadingImages(false);
        });
    } else {
      setImages([]);
    }
  }, [report?.id]);

  // ✅ Add ESC key listener
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation(); // ← Prevent parent modals from closing
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

 if (!open || !localReport) {
  console.log("Modal not opening: open=", open, "report=", localReport);
  return null;
}

const handleUpdateStatus = async () => {
  if (!localReport) return;

  const reportType = localReport.type;
  const reportId = localReport.id;

  if (!reportType || !reportId) {
    alert("Missing report identifiers (type/id). Cannot update.");
    return;
  }

  const currentIndex = STATUS_FLOW.indexOf(localReport.status as ReportStatus);

  // ❗ אם כבר resolved — לא מאפשרים עדכון
  if (currentIndex === STATUS_FLOW.length - 1) {
    alert("This report is already resolved — further updates are not allowed.");
    return;
  }

  const newStatus = STATUS_FLOW[currentIndex + 1];
  const updatedBy = "System Operator";
  const updatedAt = Date.now();

  // ⬅️ כאן נבדוק אם עברנו ל־resolved
  const extraFields =
    newStatus === "resolved"
      ? { resolvedAt: updatedAt }
      : {};

  const nextHistory = [
    ...(localReport.statusHistory || []),
    { status: newStatus, updatedBy, updatedAt },
  ];

  try {
    // כתיבה למסד
  await updateReportInDB(reportType, reportId, {
    status: newStatus,
    statusHistory: nextHistory,
    updatedBy,
    updatedAt,
    ...extraFields,
  });

    //  עדכון מקומי כדי שהמסך וה־Timeline יתרנדרו מיד
    const merged = {
      ...localReport,
      status: newStatus,
      statusHistory: nextHistory,
      updatedBy,
      updatedAt,
      ...extraFields,
    };

    setLocalReport(merged);
    onReportUpdated?.(merged); // שולח חזרה לאב (ReportsTableModal)
    alert(`Status updated to "${newStatus}"`);
    setConfirmAction(null);

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Failed to update report:", err.message);
      alert(`Failed to update report: ${err.message}`);
    } else {
      console.error("Failed to update report:", err);
      alert("Failed to update report: Unknown error");
    }
  }
};

const handleDeleteReport = async () => {
  if (!localReport) return;

  const reportType = localReport.type;
  const reportId = localReport.id;

  if (!reportType || !reportId) {
    alert("Missing report identifiers (type/id). Cannot delete.");
    console.error("Delete aborted: type/id missing", { reportType, reportId, localReport });
    return;
  }

  try {
    await softDeleteReportInDB(reportType, reportId, "System Operator");

    const merged = {
      ...localReport,
      deleted: true,
      deletedAt: Date.now(),
      deletedBy: "System Operator",
    };


    // setLocalReport(merged);
    onReportUpdated?.(merged); // ✅ חשוב מאוד!
    alert("Report marked as deleted.");
    setConfirmAction(null);
    onClose();

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Failed to soft-delete report:", err.message);
      alert(`Failed to soft-delete report: ${err.message}`);
    } else {
      console.error("Failed to soft-delete report:", err);
      alert("Failed to soft-delete report: Unknown error");
    }
  }
};

  const renderTimeline = () => {
    if (!localReport?.statusHistory?.length) {
      return <p className="text-gray-500 text-sm">No status history available.</p>;
    }

    return (
      <ul className="space-y-2 mt-2 border-l-2 border-gray-300 pl-4">
        {localReport.statusHistory.map((entry, idx) => (
          <li key={idx} className="relative">
            <span className="absolute -left-[9px] top-[4px] w-2 h-2 bg-blue-500 rounded-full" />
            <p className="text-sm">
              <strong>{entry.status.toUpperCase()}</strong> — updated by{" "}
              <span className="text-blue-700">{entry.updatedBy}</span>{" "}
              on {new Date(entry.updatedAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    );
  };
  if (!open || !localReport) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-[800px] max-h-[90vh] overflow-y-auto relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-3xl font-bold text-gray-400 hover:text-red-600 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg p-6 mb-6 -mt-2 -mx-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">
              📋 Report Details
            </h2>
            <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
              localReport.status === 'resolved' ? 'bg-green-500' :
              localReport.status === 'in progress' ? 'bg-yellow-500' :
              localReport.status === 'pending' ? 'bg-orange-500' :
              'bg-red-500'
            }`}>
              {localReport.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">ID: #{localReport?.id}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">📍 {localReport.area}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">🏷️ {localReport?.type?.toUpperCase()}</span>
          </div>
          <p className="text-blue-100 text-sm mt-2">
            Submitted: {new Date(localReport.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Description Section */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="font-semibold text-gray-700 block mb-2 flex items-center gap-2">
            <span className="text-lg">📝</span> Description
          </label>
          <textarea
            readOnly
            value={localReport.description || "No description provided"}
            className="w-full border-0 rounded-md px-3 py-2 bg-white resize-none h-24 text-gray-700 focus:outline-none"
          />
        </div>

        {/* Summary and Timeline Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold text-lg mb-3 text-blue-900 flex items-center gap-2">
              <span>ℹ️</span> Report Summary
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">Category:</span>
                <span className="text-gray-700">{localReport.type}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">Address:</span>
                <span className="text-gray-700">{localReport.address || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">Submitted By:</span>
                <span className="text-gray-700">{localReport.submittedBy || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">Email:</span>
                <span className="text-gray-700">{localReport.email || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">Phone:</span>
                <span className="text-gray-700">{localReport.phone || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">Last Updated:</span>
                <span className="text-gray-700">{new Date(localReport.updatedAt || localReport.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">Updated By:</span>
                <span className="text-gray-700">{localReport.updatedBy || "—"}</span>
              </div>
            </div>
          </div>


          {/* Timeline */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="font-bold text-lg mb-3 text-purple-900 flex items-center gap-2">
              <span>⏱️</span> Status Timeline
            </h3>
            {renderTimeline()}
          </div>
        </div>

            {/* תמונות - מחוץ ל־grid */}
          {loadingImages && (
            <div className="mt-4 text-center text-gray-500">
              Loading images...
            </div>
          )}

          {!loadingImages && images.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-bold text-lg mb-3 text-green-900 flex items-center gap-2">
                <span>📷</span> Attached Images ({images.length})
              </h3>
              <div className="relative">
                <button
                  onClick={() => {
                    setSelectedImageIndex(0);
                    setImageViewerOpen(true);
                  }}
                  className="relative cursor-pointer group"
                >
                  <Image
                    src={images[0]}
                    alt="Report image"
                    width={600}
                    height={400}
                    className="rounded border object-cover w-full hover:opacity-90 transition"
                  />
                  {images.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded text-sm font-semibold">
                      +{images.length - 1} more
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition rounded">
                    <span className="text-white text-lg opacity-0 group-hover:opacity-100 transition font-semibold">
                      Click to view all
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {!loadingImages && images.length === 0 && localReport.mediaUrl && (
            <div className="mt-4">
              <h3 className="font-semibold mb-1">Attached Image (Legacy)</h3>
              <Image
                src={localReport.mediaUrl}
                alt={`Report ${localReport.id} image`}
                width={600}
                height={400}
                className="rounded border object-cover"
              />
            </div>
          )}





        {/* Action Buttons */}
        <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
            onClick={() => setConfirmAction("delete")}
          >
            <span>🗑️</span> Delete Report
          </button>
          <button
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
            onClick={() => setConfirmAction("update")}
          >
            <span>✅</span> Update Status
          </button>
        </div>

        {/* מודל לאישור פעולה */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-[400px] shadow-xl text-center">
              <h3 className="text-lg font-semibold mb-2">
                {confirmAction === "update"
                  ? "Confirm Status Update"
                  : "Confirm Delete Report"}
              </h3>
              <p className="text-gray-600 mb-4">
                {confirmAction === "update"
                  ? "Are you sure you want to update this report to the next status?"
                  : "This will permanently remove the report. Continue?"}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </button>
                {confirmAction === "update" ? (
                  <button
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    onClick={handleUpdateStatus}
                  >
                    Yes, Update
                  </button>
                ) : (
                  <button
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    onClick={handleDeleteReport}
                  >
                    Yes, Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
      {imageViewerOpen && images.length > 0 && (
        <ImageViewerModal
          images={images}
          initialIndex={selectedImageIndex}
          onClose={() => setImageViewerOpen(false)}
        />
      )}
    </div>
  );
}

