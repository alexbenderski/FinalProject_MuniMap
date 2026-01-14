import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/firebase-admin";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type StatusHistory = {
  status: string | number;
  updatedAt: number;
  updatedBy?: string;
}

type ReportData = {
  type?: string;
  area?: string;
  statusHistory?: StatusHistory[] | Record<string, StatusHistory>;
}

type DataSnapshot = {
  exists: () => boolean;
  forEach: (callback: (snap: DataSnapshot) => void) => void;
  val: () => ReportData | null;
}

// Map numeric indices to status strings
const STATUS_MAP: Record<number, string> = {
  0: "open",
  1: "pending",
  2: "in progress",
  3: "resolved"
};

const normalizeStatus = (status: string | number): string => {
  if (typeof status === "number") {
    return STATUS_MAP[status] || "unknown";
  }
  return status.toLowerCase();
};

const processReportData = (
  reportData: ReportData,
  category: string,
  area: string,
  normalizedStart: string,
  normalizedEnd: string,
  cutoff: number,
  deltas: number[]
): void => {
  if (category !== "all" && reportData.type !== category) return;
  if (area !== "all" && reportData.area !== area) return;

  if (!reportData.statusHistory) return;

  const history = Array.isArray(reportData.statusHistory)
    ? reportData.statusHistory
    : Object.values(reportData.statusHistory);

  const start = (history as StatusHistory[]).find((h) =>
    normalizeStatus(h.status) === normalizedStart
  );
  const end = (history as StatusHistory[]).find((h) =>
    normalizeStatus(h.status) === normalizedEnd
  );

  if (!start || !end) return;
  if (start.updatedAt < cutoff) return;
  if (end.updatedAt <= start.updatedAt) return;

  deltas.push(end.updatedAt - start.updatedAt);
};

export async function POST(req: NextRequest) {
  const {
    monthsBack,
    category,
    area,
    statusStart,
    statusEnd,
  } = await req.json() as {
    monthsBack: number;
    category: string;
    area: string;
    statusStart: string;
    statusEnd: string;
  };

  const cutoff = Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000;
  const normalizedStart = normalizeStatus(statusStart);
  const normalizedEnd = normalizeStatus(statusEnd);

  const deltas: number[] = [];

  // Search in ArchivedReports first - new path: /ArchivedReports/{year}/{month}/{city}/{type}/{id}
  const archiveSnap = await db.ref("ArchivedReports").once("value");
  if (archiveSnap.exists()) {
    archiveSnap.forEach((yearSnap: DataSnapshot) => {
      yearSnap.forEach((monthSnap: DataSnapshot) => {
        monthSnap.forEach((citySnap: DataSnapshot) => {
          citySnap.forEach((typeSnap: DataSnapshot) => {
            typeSnap.forEach((reportSnap: DataSnapshot) => {
              const r = reportSnap.val() as ReportData | null;
              if (!r) return;

              processReportData(r, category, area, normalizedStart, normalizedEnd, cutoff, deltas);
            });
          });
        });
      });
    });
  }

  // Also search in active Reports - new path: /Reports/ActiveReports/{city}/{type}/{id}
  const reportsSnap = await db.ref("Reports/ActiveReports").once("value");
  if (reportsSnap.exists()) {
    reportsSnap.forEach((citySnap: DataSnapshot) => {
      citySnap.forEach((typeSnap: DataSnapshot) => {
        typeSnap.forEach((reportSnap: DataSnapshot) => {
          const r = reportSnap.val() as ReportData | null;
          if (!r) return;

          processReportData(r, category, area, normalizedStart, normalizedEnd, cutoff, deltas);
        });
      });
    });
  }

  if (deltas.length === 0) {
    return NextResponse.json({ avgDays: 0, count: 0 });
  }

  const avgMs = deltas.reduce((a, b) => a + b, 0) / deltas.length;

  return NextResponse.json({
    avgDays: avgMs / (1000 * 60 * 60 * 24),
    count: deltas.length,
  });
}
