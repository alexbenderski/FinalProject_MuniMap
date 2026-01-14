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

    // New path: /Reports/ActiveReports/{city}/{type}/{id}
    const snapshot = await db.ref("Reports/ActiveReports").once("value");

    if (!snapshot.exists()) {
      return NextResponse.json([]);
    }

    const rawData = snapshot.val() as Record<string, Record<string, Record<string, Report>>>;
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
    const months: Record<string, { totalDays: number; count: number; sortKey: number }> = {};

    // Iterate through city -> type -> id structure
    Object.values(rawData).forEach((cityData) => {
      Object.values(cityData).forEach((typeGroup) => {
        Object.values(typeGroup).forEach((r: Report) => {
          if (r.deleted) return;
          if (!r.timestamp || r.timestamp < cutoff) return;
          if (r.status?.toLowerCase() !== "resolved") return;
          if (!r.resolvedAt) return;

          const diffDays = (r.resolvedAt - r.timestamp) / (1000 * 60 * 60 * 24);
          const date = new Date(r.timestamp);
          const monthKey = date.toLocaleString("en", { month: "short", year: "2-digit" });
          const sortKey = date.getFullYear() * 100 + date.getMonth();

          if (!months[monthKey]) months[monthKey] = { totalDays: 0, count: 0, sortKey };
          months[monthKey].totalDays += diffDays;
          months[monthKey].count++;
        });
      });
    });

    const result = Object.entries(months)
      .map(([month, d]) => ({
        month,
        days: +(d.totalDays / d.count).toFixed(1),
        sortKey: d.sortKey,
      }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ month, days }) => ({ month, days }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching resolution time data:", error);
    return NextResponse.json({ error: "Failed to fetch resolution time data" }, { status: 500 });
  }
}
