import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/firebase-admin";
import { Report } from "@/lib/types";
import * as XLSX from "xlsx";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* ---------- helpers ---------- */
type ExportReportRow = {
  id: string;
  area: string;
  address: string;
  category: string;
  status: string;
  description: string;
  createdAt: string;
  resolvedAt: string;
  latitude: number | string;
  longitude: number | string;
  media: boolean;
  email: string;
  phone: string;
  submittedBy: string;
};

type StatusHistoryEntry = {
  status: string;
  updatedAt: number;
  updatedBy?: string;
};

type ExportStatusRow = {
  id: string;
  area: string;
  category: string;
  status: string;
  updatedAt: string;
  updatedBy: string;
};

type AnomalyExportRow = {
  AnomalyID: string;
  EpisodeID: string;
  Area: string;
  Category: string;
  Type: string;
  Title: string;
  Description: string;
  GeneralMessage: string;
  Severity: string;
  Status: string;
  EpisodeStartAt: string;
  EpisodeEndAt: string;
  FirstDetected: string;
  LastUpdated: string;
  CurrentAvgDays: string | number;
  BaselineAvgDays: string | number;
  PercentChange: string | number;
  ZScore: string | number;
  CurrentReports: string | number;
  RelatedReportsCount: number;
};

function parseLocalDate(dateStr: string, endOfDay = false) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
    : new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

// resolvedAt → fallback ל-statusHistory
function getResolvedTimestamp(r: Report): number | null {
  if (typeof (r as Report).resolvedAt === "number") {
    return (r as Report).resolvedAt;
  }

  if (r.statusHistory) {
    const entries = Object.values(r.statusHistory) as {
      status: string;
      updatedAt?: number;
      updatedBy?: string;
    }[];

    const resolvedEntry = entries
      .filter(
        (e) => e.status === "resolved" && typeof e.updatedAt === "number"
      )
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];

    if (resolvedEntry?.updatedAt) {
      return resolvedEntry.updatedAt;
    }
  }

  return null;
}

/* ---------- Anomalies Export Handler ---------- */

async function handleAnomaliesExport(
  startMs: number,
  endMs: number,
  area?: string,
  category?: string
) {
  const anomaliesSnap = await db.ref("Anomalies/AnomalyEpisodes").once("value");
  
  if (!anomaliesSnap.exists()) {
    return NextResponse.json({ error: "No anomalies data" }, { status: 404 });
  }

  const anomaliesRows: AnomalyExportRow[] = [];

  anomaliesSnap.forEach((anomalyNode) => {
    anomalyNode.forEach((episodeNode) => {
      const episode = episodeNode.val();
      const worstSnapshot = episode.worstSnapshot;

      if (!worstSnapshot) return;

      // No date filtering for anomalies - get all episodes
      
      // Filter by area (check both area field and address)
      if (area && area !== "all") {
        const anomalyArea = worstSnapshot.area || "";
        const anomalyAddress = worstSnapshot.address || "";
        if (anomalyArea !== area && !anomalyAddress.includes(area)) {
          return;
        }
      }

      // Filter by category
      if (category && category !== "all" && worstSnapshot.category !== category) return;

      anomaliesRows.push({
        AnomalyID: worstSnapshot.id || "",
        EpisodeID: episodeNode.key || "",
        Area: worstSnapshot.area || "",
        Category: worstSnapshot.category || "",
        Type: worstSnapshot.type || "",
        Title: worstSnapshot.title || "",
        Description: worstSnapshot.description || "",
        GeneralMessage: worstSnapshot.generalMessage || "",
        Severity: worstSnapshot.severity || "",
        Status: worstSnapshot.status || "",
        EpisodeStartAt: episode.startAt ? new Date(episode.startAt).toLocaleString() : "",
        EpisodeEndAt: episode.endAt ? new Date(episode.endAt).toLocaleString() : "",
        FirstDetected: worstSnapshot.firstDetected ? new Date(worstSnapshot.firstDetected).toLocaleString() : "",
        LastUpdated: worstSnapshot.lastUpdated ? new Date(worstSnapshot.lastUpdated).toLocaleString() : "",
        CurrentAvgDays: worstSnapshot.metrics?.currentAvgDays || "",
        BaselineAvgDays: worstSnapshot.metrics?.baselineAvgDays || "",
        PercentChange: worstSnapshot.metrics?.pctChange || "",
        ZScore: worstSnapshot.metrics?.zScore || "",
        CurrentReports: worstSnapshot.metrics?.currentReports || "",
        RelatedReportsCount: worstSnapshot.relatedReports?.length || 0,
      });
    });
  });

  if (anomaliesRows.length === 0) {
    return NextResponse.json(
      { error: "No anomalies matched filters" },
      { status: 404 }
    );
  }

  const workbook = XLSX.utils.book_new();
  const anomaliesSheet = XLSX.utils.json_to_sheet(anomaliesRows);
  XLSX.utils.book_append_sheet(workbook, anomaliesSheet, "Anomalies");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=anomalies_export.xlsx",
    },
  });
}

/* ---------- API ---------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fileType,
      fromDate,
      toDate,
      area,
      category,
    }: {
      fileType: "full" | "manual" | "anomalies";
      fromDate: string;
      toDate: string;
      area?: string;
      category?: string;
    } = body;

    const startMs = parseLocalDate(fromDate);
    const endMs = parseLocalDate(toDate, true);

    // Handle anomalies export
    if (fileType === "anomalies") {
      return await handleAnomaliesExport(startMs, endMs, area, category);
    }

    const fromYear = new Date(startMs).getFullYear();
    const toYear = new Date(endMs).getFullYear();

    const snap = await db.ref("ArchivedReports").once("value");
    if (!snap.exists()) {
      return NextResponse.json({ error: "No archived data" }, { status: 404 });
    }

    const rows: ExportReportRow[] = [];
    const statusRows: {
      id: string;
      area?: string;
      category?: string;
      status: string;
      updatedAt: number;
      updatedBy?: string;
    }[] = [];

    // 🔹 לולאה דו־שלבית: שנים → קטגוריות → דיווחים
    snap.forEach((yearSnap) => {
      const year = Number(yearSnap.key);
      if (isNaN(year)) return;

      // שלב 1: צמצום לפי שנים
      if (year < fromYear || year > toYear) return;

      yearSnap.forEach((categoryNode) => {
        categoryNode.forEach((reportSnap) => {
          const r = reportSnap.val() as Report;

          // תאריך סגירה (resolvedAt או statusHistory)
          const resolvedTs = getResolvedTimestamp(r);
          if (!resolvedTs) return;

          // שלב 2: טווח מדויק
          if (resolvedTs < startMs || resolvedTs > endMs) return;

          // פילטרים ידניים
          if (fileType === "manual") {
            if (category && category !== "all" && r.type !== category) return;
            
            // Filter by area - check both r.area and address field
            if (area && area !== "all") {
              const reportArea = r.area || "";
              const reportAddress = (r as Report).address || "";
              
              // Check if area matches in either field
              if (reportArea !== area && !reportAddress.includes(area)) {
                return;
              }
            }
          }

          // For "full" export, also filter by area
          if (fileType === "full" && area && area !== "all") {
            const reportArea = r.area || "";
            const reportAddress = (r as Report).address || "";
            
            // Check if area matches in either field
            if (reportArea !== area && !reportAddress.includes(area)) {
              return;
            }
          }

          // --- Sheet ראשי (Reports) ---
          rows.push({
            id: reportSnap.key ?? "",
            area: r.area ?? "",
            address: (r as Report).address ?? "",
            category: r.type ?? "",
            status: r.status ?? "",
            description: r.description ?? "",

            createdAt: r.timestamp
              ? new Date(
                  r.timestamp < 1e12 ? r.timestamp * 1000 : r.timestamp
                ).toLocaleString()
              : "",

            resolvedAt: new Date(resolvedTs).toLocaleString(),

            latitude: (r as Report).lat ?? "",
            longitude: (r as Report).lng ?? "",

            media: (r as Report).media ?? false,
            email: (r as Report).email ?? "",
            phone: (r as Report).phone ?? "",

            submittedBy: (r as Report).submittedBy ?? "",
          });

          // --- Sheet שני (Status History) ---
      if (r.statusHistory) {
        const historyEntries = Object.values(
          r.statusHistory
        ) as StatusHistoryEntry[];

        historyEntries.forEach((entry) => {
          if (!entry.status || typeof entry.updatedAt !== "number") return;

          statusRows.push({
            id: reportSnap.key ?? "",
            area: r.area ?? "",
            category: r.type ?? "",
            status: entry.status,
            updatedAt: entry.updatedAt,
            updatedBy: entry.updatedBy ?? "",
          });
        });
      }

        });
      });
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No reports matched filters" },
        { status: 404 }
      );
    }

    /* ---------- Excel ---------- */

    const workbook = XLSX.utils.book_new();

    const reportsSheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(
      workbook,
      reportsSheet,
      "Archived Reports"
    );

    if (statusRows.length > 0) {
      const statusSheet = XLSX.utils.json_to_sheet(
        statusRows.map((s) => ({
          ReportID: s.id,
          Area: s.area ?? "",
          Category: s.category ?? "",
          Status: s.status,
          UpdatedAt: new Date(s.updatedAt).toLocaleString(),
          UpdatedBy: s.updatedBy ?? "",
        }))
      );

      XLSX.utils.book_append_sheet(
        workbook,
        statusSheet,
        "Status History"
      );
    }

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          "attachment; filename=archived_reports.xlsx",
      },
    });
  } catch (err) {
    console.error("Archive export error:", err);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
