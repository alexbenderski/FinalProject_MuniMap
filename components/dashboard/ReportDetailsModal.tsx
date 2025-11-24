"use client";
import React, { useEffect, useState } from "react";
import { Report,FilterStatus } from "@/lib/types";
import { updateReportInDB,softDeleteReportInDB } from "@/lib/client/fetchers";
import Image from "next/image";



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

    useEffect(() => {
    setLocalReport(report ?? null);
  }, [report?.id]);

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[700px] relative shadow-2xl">
        {/* כפתור סגירה */}
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-2xl font-bold text-red-600"
        >
          ✕
        </button>

        {/* כותרת */}
        <h2 className="text-xl font-bold text-center mb-2">
          Report #{localReport?.id || "—"} - {localReport?.type?.toUpperCase()}
        </h2>
        
        <p className="text-center text-gray-600 mb-4">
          Submitted on {new Date(localReport.timestamp).toLocaleString()} | Location:{" "}
          {localReport.area}
        </p>

        {/* תיאור */}
        <div className="mb-4">
          <label className="font-semibold block mb-1">Description:</label>
          <textarea
            readOnly
            value={localReport.description || ""}
            className="w-full border rounded-md px-2 py-1 bg-gray-50 resize-none h-20"
          />
        </div>

        {/* תקציר + טיימליין */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-1">Summary</h3>
            <div className="text-sm space-y-1">
              <p>
                <strong>Category:</strong> {localReport.type}
              </p>
              <p>
              <strong>Address:</strong> {localReport.address || "—"}
            </p>
              <p>
                <strong>Status:</strong> {localReport.status}
              </p>
              <p>
                <strong>Submitted By:</strong> {localReport.submittedBy || "—"}
              </p>
              <p>
                <strong>Email:</strong> {localReport.email || "—"}
              </p>
              <p>
                <strong>Phone:</strong> {localReport.phone || "—"}
              </p>
              <p>
                <strong>Last Updated:</strong>{" "}
                {new Date(localReport.updatedAt || localReport.timestamp).toLocaleString()}
              </p>
              <p>
                <strong>Updated By:</strong> {localReport.updatedBy || "—"}
              </p>
            </div>
          </div>


          {/* טיימליין */}
          <div>
            <h3 className="font-semibold mb-1">Status Timeline</h3>
            {renderTimeline()}

            {/* תמונה */}
          {localReport.mediaUrl && (
            <div className="mt-4">
              <h3 className="font-semibold mb-1">Attached Image</h3>
              <Image
                src={localReport.mediaUrl}
                alt={`Report ${localReport.id} image`}
                width={600}
                height={400}
                className="rounded border object-cover"
              />
            </div>
          )}
        </div>

        </div>





        {/* כפתורים */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            onClick={() => setConfirmAction("delete")}
          >
            Delete Report
          </button>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            onClick={() => setConfirmAction("update")}
          >
            Update Status
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
    </div>
  );
}

