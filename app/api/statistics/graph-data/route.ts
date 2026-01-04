import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/firebase-admin";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TimeRange = "month" | "3month" | "6month" | "year" | "custom";
type GraphTopic = "frequency" | "avgResolve" | "resolvedVsTotal" | "unresolved";

interface Report {
  timestamp?: number;
  deleted?: boolean;
  status?: string;
  resolvedAt?: number;
}

// Helper functions
const startOfMonth = (t: number) => new Date(new Date(t).getFullYear(), new Date(t).getMonth(), 1).getTime();

const addMonths = (t: number, m: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + m, 1).getTime();
};

function monthKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelHe(ts: number) {
  return new Intl.DateTimeFormat("he-IL", { month: "short" }).format(new Date(ts));
}

function getRangeBounds(
  timeRange: TimeRange,
  fromDate?: string,
  toDate?: string
) {
  const now = new Date();
  let start: number;
  let end: number;
  let monthsBack: number;

  if (timeRange === "custom" && fromDate && toDate) {
    start = new Date(fromDate).getTime();
    end = new Date(toDate).setHours(23, 59, 59, 999);
    monthsBack = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30)));
  } else {
    switch (timeRange) {
      case "month":
        monthsBack = 1;
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();
        break;
      case "3month":
        monthsBack = 3;
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime();
        end = now.getTime();
        break;
      case "6month":
        monthsBack = 6;
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime();
        end = now.getTime();
        break;
      case "year":
      default:
        monthsBack = 12;
        start = new Date(now.getFullYear() - 1, now.getMonth(), 1).getTime();
        end = now.getTime();
        break;
    }
  }

  return { start, end, monthsBack };
}

function buildEmptyMonthBuckets(timeRange: TimeRange, fromDate?: string, toDate?: string) {
  const { start, end, monthsBack } = getRangeBounds(timeRange, fromDate, toDate);
  const buckets: { key: string; label: string }[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const ts = addMonths(start, i);
    buckets.push({ key: monthKey(ts), label: monthLabelHe(ts) });
  }
  return { buckets, start, end };
}

export async function POST(req: NextRequest) {
  try {
    const { category, timeRange, topic, fromDate, toDate } = await req.json() as {
      category: "garbage" | "lighting" | "tree" | "hazard";
      timeRange: TimeRange;
      topic: GraphTopic;
      fromDate?: string;
      toDate?: string;
    };

    const snapshot = await db.ref("Reports").once("value");

    if (!snapshot.exists()) {
      return NextResponse.json([]);
    }

    const data = snapshot.val() as Record<string, Record<string, Report>>;

    const { buckets, start, end } = buildEmptyMonthBuckets(timeRange, fromDate, toDate);

    // Intermediate aggregation tables
    const counters: Record<
      string,
      { reports: number; resolved: number; totalResolveDays: number; resolvedCount: number; unresolved: number }
    > = Object.fromEntries(
      buckets.map(b => [b.key, { reports: 0, resolved: 0, totalResolveDays: 0, resolvedCount: 0, unresolved: 0 }])
    );

    const catGroup = data[category] || {};
    Object.values(catGroup).forEach((r: Report) => {
      if (r.deleted) return;
      if (!r.timestamp) return;
      const t = Number(r.timestamp);
      if (t < start || t >= end) return;
      const k = monthKey(startOfMonth(t));
      const c = counters[k];
      if (!c) return;

      c.reports += 1;

      const status = (r.status || "").toLowerCase();
      if (status === "resolved" && r.resolvedAt) {
        c.resolved += 1;
        const days = (Number(r.resolvedAt) - t) / (1000 * 60 * 60 * 24);
        if (days >= 0) {
          c.totalResolveDays += days;
          c.resolvedCount += 1;
        }
      } else {
        c.unresolved += 1;
      }
    });

    // Build final series based on topic
    const result = buckets.map(({ key, label }) => {
      const c = counters[key];
      switch (topic) {
        case "frequency":
          return { month: label, reports: c.reports };
        case "avgResolve":
          return {
            month: label,
            reports: c.reports,
            avgDays: c.resolvedCount ? +(c.totalResolveDays / c.resolvedCount).toFixed(1) : 0,
          };
        case "resolvedVsTotal":
          return { month: label, reports: c.reports, resolved: c.resolved };
        case "unresolved":
          return { month: label, reports: c.unresolved };
        default:
          return { month: label, reports: 0 };
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching graph data:", error);
    return NextResponse.json({ error: "Failed to fetch graph data" }, { status: 500 });
  }
}
