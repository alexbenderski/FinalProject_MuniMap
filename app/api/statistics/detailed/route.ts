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
  area?: string;
  type?: string;
}

interface DetailedStats {
  topAreas: Array<{ area: string; total: number; unresolvedPercent: string; avgResolveDays: string }>;
  topUnresolvedAreas: Array<{ area: string; total: number; unresolvedPercent: string; avgResolveDays: string }>;
  topAreasByResolveTime: Array<{ area: string; total: number; unresolvedPercent: string; avgResolveDays: string }>;
  topCategoriesByResolveTime: Array<{ category: string; avgResolveDays: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const { timeRange, fromDate, toDate } = await req.json() as {
      timeRange: TimeRange;
      fromDate?: string;
      toDate?: string;
    };

    const snapshot = await db.ref("Reports").once("value");

    if (!snapshot.exists()) {
      return NextResponse.json(null);
    }

    const data = snapshot.val() as Record<string, Record<string, Report>>;

    // Calculate exact time range
    const now = Date.now();
    let start: number;
    let end: number;

    if (timeRange === "custom" && fromDate && toDate) {
      start = new Date(fromDate).getTime();
      end = new Date(toDate).setHours(23, 59, 59, 999);
    } else {
      const rangeDays: Record<Exclude<TimeRange, "custom">, number> = {
        month: 30,
        "3month": 90,
        "6month": 180,
        year: 365,
      };
      const days = rangeDays[timeRange as Exclude<TimeRange, "custom">];
      start = now - days * 24 * 60 * 60 * 1000;
      end = now;
    }

    // Filter only reports in range
    const reports: Report[] = Object.values(data)
      .flatMap((group) => Object.values(group))
      .filter(
        (r): r is Report => !r.deleted &&
          typeof r.timestamp === "number" &&
          r.timestamp >= start &&
          r.timestamp <= end
      );

    // Aggregations by area and category
    const areaAgg: Record<
      string,
      { total: number; unresolved: number; resolved: number; sumDays: number; resolvedCount: number }
    > = {};

    const catAgg: Record<
      string,
      { sumDays: number; resolvedCount: number }
    > = {};

    for (const r of reports) {
      const area = r.area ?? "Unknown";
      areaAgg[area] ??= { total: 0, unresolved: 0, resolved: 0, sumDays: 0, resolvedCount: 0 };
      areaAgg[area].total += 1;

      const isResolved = r.status?.toLowerCase() === "resolved";
      if (isResolved) {
        areaAgg[area].resolved += 1;
        if (typeof r.resolvedAt === "number" && typeof r.timestamp === "number") {
          areaAgg[area].sumDays += (r.resolvedAt - r.timestamp) / (1000 * 60 * 60 * 24);
          areaAgg[area].resolvedCount += 1;
        }
      } else {
        areaAgg[area].unresolved += 1;
      }

      const cat = r.type ?? "other";
      catAgg[cat] ??= { sumDays: 0, resolvedCount: 0 };
      if (isResolved && typeof r.resolvedAt === "number" && typeof r.timestamp === "number") {
        catAgg[cat].sumDays += (r.resolvedAt - r.timestamp) / (1000 * 60 * 60 * 24);
        catAgg[cat].resolvedCount += 1;
      }
    }

    // Derive top lists
    const topAreas = Object.entries(areaAgg)
      .map(([area, s]) => ({
        area,
        total: s.total,
        unresolvedPercent: s.total ? ((s.unresolved / s.total) * 100).toFixed(1) : "0",
        avgResolveDays: s.resolvedCount ? (s.sumDays / s.resolvedCount).toFixed(1) : "—",
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topUnresolvedAreas = [...topAreas]
      .sort((a, b) => parseFloat(b.unresolvedPercent) - parseFloat(a.unresolvedPercent))
      .slice(0, 5);

    const topAreasByResolveTime = Object.entries(areaAgg)
      .map(([area, s]) => ({
        area,
        total: s.total,
        unresolvedPercent: s.total ? ((s.unresolved / s.total) * 100).toFixed(1) : "0",
        avgResolveDays: s.resolvedCount ? (s.sumDays / s.resolvedCount).toFixed(1) : "—",
      }))
      .sort((a, b) => parseFloat(b.avgResolveDays) - parseFloat(a.avgResolveDays))
      .slice(0, 5);

    const topCategoriesByResolveTime = Object.entries(catAgg)
      .map(([category, s]) => ({
        category,
        avgResolveDays: s.resolvedCount ? (s.sumDays / s.resolvedCount).toFixed(1) : "—",
      }))
      .filter((x) => x.avgResolveDays !== "—")
      .sort((a, b) => parseFloat(b.avgResolveDays) - parseFloat(a.avgResolveDays))
      .slice(0, 5);

    const result: DetailedStats = {
      topAreas,
      topUnresolvedAreas,
      topAreasByResolveTime,
      topCategoriesByResolveTime,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching detailed statistics:", error);
    return NextResponse.json({ error: "Failed to fetch detailed statistics" }, { status: 500 });
  }
}
