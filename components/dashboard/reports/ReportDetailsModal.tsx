"use client";
import React, { useEffect, useState } from "react";
import { Report,FilterStatus, ReportComment } from "@/lib/types";
import { updateReportInDB,softDeleteReportInDB, addReportComment, getCurrentUserInfo, fetchCurrentUserAuthority } from "@/lib/client/fetchers";
import { getReportImages } from "@/lib/client/storage";
import Image from "next/image";
import ImageViewerModal from "../common/ImageViewerModal";
import { useLanguage } from "@/lib/i18n";



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
  const { t, language } = useLanguage();
  const [localReport, setLocalReport] = useState<Report | null>(report);
  const [confirmAction, setConfirmAction] = useState<null | "delete" | "update">(null);
  const [images, setImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

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
    alert(t("reports.missingIdentifiers"));
    return;
  }

  const currentIndex = STATUS_FLOW.indexOf(localReport.status as ReportStatus);

  // ❗ אם כבר resolved — לא מאפשרים עדכון
  if (currentIndex === STATUS_FLOW.length - 1) {
    alert(t("reports.alreadyResolved"));
    return;
  }

  const newStatus = STATUS_FLOW[currentIndex + 1];
  const updatedAt = Date.now();

  // Get current user info and authority
  const { email } = getCurrentUserInfo();
  const authority = await fetchCurrentUserAuthority();
  const updatedBy = authority || "Municipal Worker";

  // ⬅️ כאן נבדוק אם עברנו ל־resolved
  const extraFields =
    newStatus === "resolved"
      ? { resolvedAt: updatedAt }
      : {};

  const nextHistory = [
    ...(localReport.statusHistory || []),
    { status: newStatus, updatedBy, updatedAt, authority, email: email || undefined },
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
    alert(`${t("reports.statusUpdatedTo")} "${newStatus}"`);
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
    alert(t("reports.missingIdentifiers"));
    console.error("Delete aborted: type/id missing", { reportType, reportId, localReport });
    return;
  }

  // Get current user info
  const { email } = getCurrentUserInfo();
  const authority = await fetchCurrentUserAuthority();
  const deletedBy = authority || email || "Unknown User";

  try {
    await softDeleteReportInDB(reportType, reportId, deletedBy);

    const merged = {
      ...localReport,
      deleted: true,
      deletedAt: Date.now(),
      deletedBy,
    };


    // setLocalReport(merged);
    onReportUpdated?.(merged); // ✅ חשוב מאוד!
    alert(t("reports.reportMarkedDeleted"));
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
      return <p className="text-gray-500 text-sm">{t("reports.noStatusHistory")}</p>;
    }

    return (
      <ul className="space-y-3 mt-2 border-l-2 border-gray-300 pl-4">
        {localReport.statusHistory.map((entry, idx) => (
          <li key={idx} className="relative">
            <span className="absolute -left-[9px] top-[4px] w-2 h-2 bg-blue-500 rounded-full" />
            <p className="text-sm font-semibold">
              <strong>{entry.status.toUpperCase()}</strong>
            </p>
            <p className="text-xs text-gray-600">
              {t("reports.updatedBy")}: <span className="text-purple-700 font-medium">{entry.authority || entry.updatedBy}</span>
            </p>
            {entry.email && (
              <p className="text-xs text-blue-600">
                📧 {entry.email}
              </p>
            )}
            <p className="text-xs text-gray-500">
              {new Date(entry.updatedAt).toLocaleString(language === "he" ? "he-IL" : "en-US")}
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
              📋 {t("reports.reportDetails")}
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
            <span className="bg-white/20 px-3 py-1 rounded-full">{t("reportsTable.columns.id")}: #{localReport?.id}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">📍 {localReport.area}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">🏷️ {localReport?.type?.toUpperCase()}</span>
          </div>

        </div>

        {/* Description Section */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="font-semibold text-gray-700 block mb-2 flex items-center gap-2">
            <span className="text-lg">📝</span> {t("reports.description")}
          </label>
          <textarea
            readOnly
            value={localReport.description || t("reports.noDescription")}
            className="w-full border-0 rounded-md px-3 py-2 bg-white resize-none h-24 text-gray-700 focus:outline-none"
          />
        </div>

        {/* Comments Section - Collapsible */}
        <div className="mb-6 bg-amber-50 p-4 rounded-lg border border-amber-200">
          <button
            onClick={() => setCommentsExpanded(!commentsExpanded)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="font-bold text-lg text-amber-900 flex items-center gap-2">
              <span>💬</span> {t("reports.comments")} ({localReport.comments?.length || 0})
            </h3>
            <span className="text-amber-700 text-xl font-bold">
              {commentsExpanded ? "▲" : "▼"}
            </span>
          </button>
          
          {commentsExpanded && (
            <div className="mt-4">
              {/* Existing Comments */}
              {(!localReport.comments || localReport.comments.length === 0) ? (
                <p className="text-gray-500 text-sm italic mb-4">{t("reports.noComments")}</p>
              ) : (
                <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto">
                  {[...localReport.comments].sort((a, b) => b.timestamp - a.timestamp).map((comment) => (
                    <div key={comment.id} className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-amber-800">{comment.userName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.timestamp).toLocaleString(language === "he" ? "he-IL" : "en-US")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                      <p className="text-xs text-blue-600 mt-1">📧 {comment.userEmail}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Comment */}
              <div className="border-t border-amber-200 pt-4">
                <label className="font-semibold text-amber-800 block mb-2">
                  {t("reports.writeComment")}:
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t("reports.writeComment")}
                  className="w-full border-2 border-amber-300 rounded-md px-3 py-2 resize-none h-20 text-gray-700 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={async () => {
                      if (!newComment.trim()) {
                        alert(t("reports.commentCannotBeEmpty"));
                        return;
                      }
                      
                      const { email } = getCurrentUserInfo();
                      if (!email) {
                        alert(t("reports.userNotAuthenticated"));
                        return;
                      }

                      setSubmittingComment(true);
                      try {
                        const result = await addReportComment(
                          localReport.type || "",
                          localReport.id || "",
                          newComment
                        );
                        
                        // Update local state
                        const updatedComments = [...(localReport.comments || []), result.comment];
                        const updatedReport = { ...localReport, comments: updatedComments };
                        setLocalReport(updatedReport);
                        onReportUpdated?.(updatedReport);
                        setNewComment("");
                        alert(t("reports.commentAdded"));
                      } catch (err) {
                        console.error("Failed to add comment:", err);
                        alert(t("reports.failedToAddComment"));
                      } finally {
                        setSubmittingComment(false);
                      }
                    }}
                    disabled={submittingComment || !newComment.trim()}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>✓</span>
                    {submittingComment ? t("reports.submitting") : t("reports.addComment")}
                  </button>

                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary and Timeline Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold text-lg mb-3 text-blue-900 flex items-center gap-2">
              <span>ℹ️</span> {t("reports.reportSummary")}
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">{t("reports.category")}:</span>
                <span className="text-gray-700">{localReport.type}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">{t("reports.address")}:</span>
                <span className="text-gray-700">{localReport.address || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">{t("reports.submittedBy")}:</span>
                <span className="text-gray-700">{localReport.submittedBy || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">{t("reports.email")}:</span>
                <span className="text-gray-700">{localReport.email || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">{t("reports.phone")}:</span>
                <span className="text-gray-700">{localReport.phone || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">{t("reports.lastUpdated")}:</span>
                <span className="text-gray-700">{new Date(localReport.updatedAt || localReport.timestamp).toLocaleString(language === "he" ? "he-IL" : "en-US")}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 min-w-[120px]">{t("reports.updatedBy")}:</span>
                <span className="text-gray-700">{localReport.updatedBy || "—"}</span>
              </div>
            </div>
          </div>


          {/* Timeline */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="font-bold text-lg mb-3 text-purple-900 flex items-center gap-2">
              <span>⏱️</span> {t("reports.statusTimeline")}
            </h3>
            {renderTimeline()}
          </div>
        </div>

            {/* תמונות - מחוץ ל־grid */}
          {loadingImages && (
            <div className="mt-4 text-center text-gray-500">
              {t("reports.loadingImages")}
            </div>
          )}

          {!loadingImages && images.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-bold text-lg mb-3 text-green-900 flex items-center gap-2">
                <span>📷</span> {t("reports.attachedImages")} ({images.length})
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
                      {t("reports.clickToViewAll")}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {!loadingImages && images.length === 0 && localReport.mediaUrl && (
            <div className="mt-4">
              <h3 className="font-semibold mb-1">{t("reports.attachedImageLegacy")}</h3>
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
            <span>🗑️</span> {t("reports.deleteReport")}
          </button>
          <button
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
            onClick={() => setConfirmAction("update")}
          >
            <span>✅</span> {t("reports.updateStatus")}
          </button>
        </div>

        {/* מודל לאישור פעולה */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-[400px] shadow-xl text-center">
              <h3 className="text-lg font-semibold mb-2">
                {confirmAction === "update"
                  ? t("reports.confirmStatusUpdate")
                  : t("reports.confirmDelete")}
              </h3>
              <p className="text-gray-600 mb-4">
                {confirmAction === "update"
                  ? t("reports.confirmStatusUpdateMsg")
                  : t("reports.confirmDeleteMsg")}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  onClick={() => setConfirmAction(null)}
                >
                  {t("common.cancel")}
                </button>
                {confirmAction === "update" ? (
                  <button
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    onClick={handleUpdateStatus}
                  >
                    {t("reports.yesUpdate")}
                  </button>
                ) : (
                  <button
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    onClick={handleDeleteReport}
                  >
                    {t("reports.yesDelete")}
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

