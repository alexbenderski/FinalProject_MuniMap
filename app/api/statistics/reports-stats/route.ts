import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/firebase-admin";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TimeRange = "month" | "3month" | "6month" | "year" | "custom";

interface Report {
  timestamp?: number;
  deleted?: boolean;
  status?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { timeRange, startDate, endDate } = await req.json() as {
      timeRange: TimeRange;
      startDate?: string;
      endDate?: string;
    };

    const snapshot = await db.ref("Reports").once("value");

    if (!snapshot.exists()) {
      return NextResponse.json({ total: 0, open: 0, pending: 0, inProgress: 0 });
    }

    const data = snapshot.val() as Record<string, Record<string, Report>>;
    const now = Date.now();

    const rangeMap: Record<Exclude<TimeRange, "custom">, number> = {
      month: 30,
      "3month": 90,
      "6month": 180,
      year: 365,
    };

    let cutoffStart: number;
    let cutoffEnd: number = now;

    if (timeRange === "custom" && startDate && endDate) {
      cutoffStart = new Date(startDate).getTime();
      cutoffEnd = new Date(endDate).setHours(23, 59, 59, 999);
    } else {
      const days = rangeMap[timeRange as Exclude<TimeRange, "custom">];
      cutoffStart = now - days * 24 * 60 * 60 * 1000;
    }

    let total = 0;
    let open = 0;
    let pending = 0;
    let inProgress = 0;

    Object.values(data).forEach((group: Record<string, Report>) => {
      Object.values(group).forEach((report: Report) => {
        if (!report.timestamp) return;
        if (report.deleted) return;
        
        if (report.timestamp < cutoffStart || report.timestamp > cutoffEnd) return;

        total++;
        const status = report.status?.toLowerCase();
        if (status === "open") open++;
        else if (status === "pending") pending++;
        else if (status === "in progress") inProgress++;
      });
    });

    return NextResponse.json({ total, open, pending, inProgress });
  } catch (error) {
    console.error("Error fetching reports stats:", error);
    return NextResponse.json({ error: "Failed to fetch reports stats" }, { status: 500 });
  }
}
