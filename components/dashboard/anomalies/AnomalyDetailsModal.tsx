"use client";
import { useState } from "react";
import Modal from "@/components/dashboard/common/Modal";
import { Anomaly, Report } from "@/lib/types";
import { getCurrentUserInfo } from "@/lib/client/fetchers";
import ReportsTableModal from "@/components/dashboard/reports/ReportsTableModal";
import Tooltip from "../common/Tooltip";
import { useLanguage } from "@/lib/i18n";


interface AnomalyDetailsModalProps {
  open: boolean;
  onClose: () => void;
  anomaly: Anomaly;
  reports?: Report[];
  onReviewUpdate?: (updatedAnomaly: Anomaly) => void;
}

export default function AnomalyDetailsModal({
  open,
  onClose,
  anomaly,
  reports,
  onReviewUpdate,
}: AnomalyDetailsModalProps) {
  const { t } = useLanguage();
  const [localAnomaly, setLocalAnomaly] = useState(anomaly);
  const [anomalyDetailsOpen, setAnomalyDetailsOpen] = useState(true);
  const [reportsTableOpen, setReportsTableOpen] = useState(false);
  const { safeKey: currentUserKey } = getCurrentUserInfo();

  // Update local anomaly when prop changes
  if (anomaly !== localAnomaly && anomaly.id === localAnomaly.id) {
    setLocalAnomaly(anomaly);
  }

  if (!open) return null;

  return (
    <>
      <Modal title={`🚨 ${t("anomalyDetails.title")}`} onClose={onClose}>
        <div className="max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Anomaly Details Section - Collapsible */}
          <div className="border-b mb-3 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-l-red-500">
            {/* Collapsible Header */}
            <div
              className="px-6 pt-4 pb-3 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => setAnomalyDetailsOpen(!anomalyDetailsOpen)}
            >
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-red-700">
                  🚨 {localAnomaly.title || t("anomalyDetails.anomalyInformation")}
                </h2>
                <span
                  className={`transform transition-transform duration-300 text-red-700 font-bold ${
                    anomalyDetailsOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </div>

              {/* Mark as Reviewed Button */}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!currentUserKey) {
                    alert(t("anomalyDetails.noUserFound"));
                    return;
                  }

                  const alreadyReviewed = !!localAnomaly.reviewedBy?.[currentUserKey];

                  if (alreadyReviewed) {
                    alert(t("anomalyDetails.alreadyReviewed"));
                    return;
                  }

                  if (!confirm(t("anomalyDetails.confirmReview"))) return;

                  try {
                    const { markAnomalyAsReviewed } = await import(
                      "@/lib/client/fetchers"
                    );
                    const result = await markAnomalyAsReviewed(localAnomaly);

                    if (result.alreadyReviewed) {
                      alert(t("anomalyDetails.alreadyReviewed"));
                      return;
                    }

                    const updatedAnomaly = {
                      ...localAnomaly,
                      reviewedBy: {
                        ...(localAnomaly.reviewedBy ?? {}),
                        [currentUserKey]: result.timestamp ?? Date.now(),
                      },
                    };

                    setLocalAnomaly(updatedAnomaly);

                    if (onReviewUpdate) {
                      onReviewUpdate(updatedAnomaly);
                    }

                    alert(`${t("anomalyDetails.markedAsReviewed")} ${result.email}`);
                  } catch (err) {
                    console.error("Error marking as reviewed:", err);
                    alert(
                      `${t("anomalyDetails.failedToMark")} ${
                        err instanceof Error ? err.message : "Unknown error"
                      }`
                    );
                  }
                }}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  currentUserKey && localAnomaly.reviewedBy?.[currentUserKey]
                    ? "bg-green-200 text-green-800 border-2 border-green-400 cursor-default"
                    : "bg-yellow-200 text-yellow-800 border-2 border-yellow-400 hover:bg-yellow-300"
                }`}
                disabled={
                  !!(currentUserKey && localAnomaly.reviewedBy?.[currentUserKey])
                }
              >
                {currentUserKey && localAnomaly.reviewedBy?.[currentUserKey]
                  ? t("anomalyDetails.reviewed")
                  : t("anomalyDetails.markAsReviewed")}
              </button>
            </div>

            {/* Collapsible Content */}
            {anomalyDetailsOpen && (
              <div className="px-6 pb-4 text-sm leading-relaxed">
                {/* Two Column Layout */}
                <div className="flex gap-10 items-start bg-white rounded-lg p-4 border-l-4 border-l-orange-400">
                  {/* Left Column — generalMessage */}
                  <div className="w-1/2">
                    {localAnomaly.generalMessage && (
                      <p className="mt-1 mb-4 text-gray-800 leading-relaxed whitespace-pre-line border-l-4 border-l-blue-400 pl-3">
                        &ldquo;{localAnomaly.generalMessage}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Right Column — Data List */}
                  <div className="w-1/2">
                    <ul className="space-y-2 text-gray-800">
                      <li className="flex items-center gap-2">
                        <span className="text-lg">📊</span>
                        <span>
                          <strong>{t("anomalyDetails.currentReports")}</strong>{" "}
                          {localAnomaly.metrics.currentReports}
                        </span>
                        <Tooltip message="Number of reports in current period" />
                      </li>

                      {localAnomaly.type === "slow_response" && (
                        <li className="flex items-center gap-2">
                          <span className="text-lg">⏱️</span>
                          <span>
                            <strong>Avg Processing Time:</strong>{" "}
                            {localAnomaly.metrics.currentAvgDays} days
                          </span>
                          <Tooltip message="Average time for closed reports in current period" />
                        </li>
                      )}

                      <li className="flex items-center gap-2">
                        <span className="text-lg">📈</span>
                        <span>
                          <strong>Historical Avg:</strong>{" "}
                          {localAnomaly.metrics.baselineMean}
                        </span>
                        <Tooltip message="Average from past 6 months" />
                      </li>

                      <li className="flex items-center gap-2">
                        <span className="text-lg">📊</span>
                        <span>
                          <strong>Std Dev:</strong>{" "}
                          {localAnomaly.metrics.baselineStd}
                        </span>
                        <Tooltip message="Standard deviation from average" />
                      </li>

                      <li className="flex items-center gap-2">
                        <span className="text-lg">🎯</span>
                        <span>
                          <strong>Threshold:</strong>{" "}
                          {localAnomaly.metrics.threshold}
                        </span>
                        <Tooltip
                          message={
                            "Threshold is the detection limit.\n\n" +
                            "If Current > Threshold: Anomaly detected\n" +
                            "If Current ≤ Threshold: Normal state"
                          }
                        />
                      </li>

                      <li className="flex items-center gap-2">
                        <span className="text-lg">📉</span>
                        <span>
                          <strong>Change:</strong>{" "}
                          {localAnomaly.metrics.pctChange > 0 ? "+" : ""}
                          {localAnomaly.metrics.pctChange}%
                        </span>
                        <Tooltip message="Percentage change from average" />
                      </li>

                      <li className="flex items-center gap-2">
                        <span className="text-lg">📐</span>
                        <span>
                          <strong>Z-Score:</strong> {localAnomaly.metrics.zScore}
                        </span>
                        <Tooltip message="Distance from average in standard deviations" />
                      </li>

                      <li className="flex items-center gap-2">
                        <span className="text-lg">📅</span>
                        <span>
                          <strong>First Detected:</strong>{" "}
                          {new Date(localAnomaly.firstDetected).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "2-digit" }
                          )}
                        </span>
                      </li>

                      {localAnomaly.center && (
                        <li className="flex items-center gap-2">
                          <span className="text-lg">🗺️</span>
                          <span>
                            <strong>Geographic Center:</strong>{" "}
                            {localAnomaly.center.lat.toFixed(5)},{" "}
                            {localAnomaly.center.lng.toFixed(5)}
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Reviewed By List */}
                {localAnomaly.reviewedBy && (
                  <div className="mt-4 border-t pt-3 bg-white rounded-lg p-3 border-l-4 border-l-green-400">
                    <h3 className="font-bold mb-2 text-green-700 flex items-center gap-2">
                      ✔️ Reviewed By:
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(localAnomaly.reviewedBy).map(
                        ([emailKey, ts]) => (
                          <li key={emailKey} className="text-gray-700">
                            📝{" "}
                            <span className="font-mono">
                              {emailKey.replace(/_/g, ".")}
                            </span>{" "}
                            –{" "}
                            {new Date(ts).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "2-digit",
                            })}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* View Related Reports Button */}
          {reports && reports.length > 0 && (
            <div className="px-6 pb-4">
              <button
                onClick={() => setReportsTableOpen(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg px-4 py-3 shadow-md hover:shadow-lg transition-all"
              >
                {t("anomalyDetails.viewRelatedReports")} ({reports.length})
              </button>
            </div>
          )}

          {/* Close Button */}
          <div className="border-t p-4 text-right bg-gray-50">
            <button
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 px-6 py-2 rounded font-semibold transition-colors"
            >
              {t("anomalyDetails.close")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reports Table Modal */}
      {reportsTableOpen && reports && (
        <ReportsTableModal
                  open={reportsTableOpen}
                  onClose={() => setReportsTableOpen(false)}
                  reports={reports}
                  selectedArea={localAnomaly.area}
                  title={`Reports for: ${localAnomaly.title}`}
                  anomalyDetails={localAnomaly}
                  onReviewUpdate={onReviewUpdate}
                  onApplyFilters={() => {
                      throw new Error("Function not implemented.");
                  }}
                />
      )}
    </>
  );
}
