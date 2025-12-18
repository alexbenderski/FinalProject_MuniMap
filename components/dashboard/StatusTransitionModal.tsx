"use client";
import { useState } from "react";
import Modal from "@/components/dashboard/Modal";

const STATUS_ORDER = ["open", "pending", "in_progress", "resolved"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function StatusTransitionModal({ open, onClose }: Props) {
  const [statusStart, setStatusStart] = useState<string | null>(null);
  const [statusEnd, setStatusEnd] = useState<string | null>(null);

  if (!open) return null;

  return (
    <Modal title="Status Transition Analysis" onClose={onClose}>
      <div className="space-y-4">

        <p className="text-sm text-gray-700">
          This view analyzes how long it takes for reports to move from one
          status to another, based on historical status changes.
        </p>

        {/* Select Start */}
        <select
          value={statusStart ?? ""}
          onChange={(e) => {
            setStatusStart(e.target.value);
            setStatusEnd(null);
          }}
        >
          <option value="" disabled>
            Select start status
          </option>

          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Select End */}
        {statusStart && (
          <select
            value={statusEnd ?? ""}
            onChange={(e) => setStatusEnd(e.target.value)}
          >
            <option value="" disabled>
              Select end status
            </option>

            {STATUS_ORDER
              .slice(STATUS_ORDER.indexOf(statusStart) + 1)
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        )}

        {statusStart && statusEnd && (
          <div className="text-sm text-gray-600">
            Selected transition: <b>{statusStart}</b> → <b>{statusEnd}</b>
          </div>
        )}
      </div>
    </Modal>
  );
}
