import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/firebase-admin";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TimeRange = "month" | "3month" | "6month" | "year" | "custom";

interface Report {
  timestamp?: number;
  deleted?: boolean;
  status?: string;
  resolvedAt?: number;
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
      return NextResponse.json([]);
    }

    const data = snapshot.val() as Record<string, Record<string, Report>>;
    const now = Date.now();

    const rangeMap: Record<Exclude<TimeRange, "custom">, number> = {
      month: 30,
      "3month": 90,
      "6month": 180,
      year: 365,
    };

    let cutoff: number;

    if (timeRange === "custom" && startDate && endDate) {
      cutoff = new Date(startDate).getTime();
    } else {
      const days = rangeMap[timeRange as Exclude<TimeRange, "custom">];
      cutoff = now - days * 24 * 60 * 60 * 1000;
    }

    // Calculate average resolution time per month
    const months: Record<string, { totalDays: number; count: number }> = {};

    Object.values(data).forEach((group) => {
      Object.values(group).forEach((r: Report) => {
        if (r.deleted) return;
        if (!r.timestamp || r.timestamp < cutoff) return;
        if (r.status?.toLowerCase() !== "resolved") return;
        if (!r.resolvedAt) return;

        const diffDays = (r.resolvedAt - r.timestamp) / (1000 * 60 * 60 * 24);
        const monthKey = new Date(r.timestamp).toLocaleString("en", { month: "short" });

        if (!months[monthKey]) months[monthKey] = { totalDays: 0, count: 0 };
        months[monthKey].totalDays += diffDays;
        months[monthKey].count++;
      });
    });

    const result = Object.entries(months).map(([month, d]) => ({
      month,
      days: +(d.totalDays / d.count).toFixed(1),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching resolution time data:", error);
    return NextResponse.json({ error: "Failed to fetch resolution time data" }, { status: 500 });
  }
}
