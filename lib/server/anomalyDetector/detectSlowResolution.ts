//detectSlowResolution.ts
import { groupBy, buildMonthlyBins, mean, std, calcDynamicThreshold } from "./utils";
import { buildAnomaly, Anomaly } from "./builders";
import { generateAnomalyDescription } from "./anomalyTextGenerator";
import { saveAnomalyUpdateSnapshot } from "./anomaly-storage";

export interface ResolveReport {
  id: string;
  type: string;
  area: string;
  timestamp: number;
  resolvedAt?: number;
  deleted?: boolean;
}

export async function detectSlowResolution(
  reports: ResolveReport[],
  now = Date.now()
): Promise<Anomaly[]> {
  console.log("\n=====================");
  console.log("🔍 detectSlowResolution START");
  console.log("=====================");
  console.log("📦 TOTAL REPORTS RECEIVED:", reports.length);

  // 1) סינון רלוונטיים
  const active = reports.filter((r) => !r.deleted && r.resolvedAt);
  console.log("📦 ACTIVE (resolved + not deleted):", active.length);

  const groups = groupBy(active, (r) => `${r.area}___${r.type}`);
  console.log("📚 TOTAL GROUPS (area × type):", groups.size);

  const anomalies: Anomaly[] = [];

  // 2) מעבר על כל קבוצה (אזור × סוג תקלה)
  for (const [key, items] of groups) {
    const [area, type] = key.split("___");

    console.log("\n--------------------------------------");
    console.log(`📍 GROUP: area="${area}", type="${type}"`);
    console.log("📝 REPORTS IN GROUP:", items.length);
    console.log(
      "🧾 SAMPLE REPORTS:",
      items.slice(0, 5).map((r) => ({
        id: r.id,
        ts: new Date(r.timestamp).toLocaleString(),
        resolvedAt: r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : null,
      }))
    );

    // 3) בניית bins של 6 חודשים (לפי timestamp של פתיחת הדיווח)
    const rawBins = buildMonthlyBins(items, (r) => r.timestamp, 6, now);
    console.log(
      "📊 RAW BINS (by count only):",
      rawBins.map((b) => ({
        month: new Date(b.ts).toLocaleDateString(),
        count: b.count,
      }))
    );

    const bins = rawBins.map((bin) => {
      const monthFrom = bin.ts;
      const monthTo = bin.ts + 30 * 24 * 60 * 60 * 1000;

      const monthReports = items.filter(
        (r) => r.timestamp >= monthFrom && r.timestamp < monthTo
      );

      const diffs = monthReports
        .filter((r) => r.resolvedAt)
        .map((r) => (r.resolvedAt! - r.timestamp) / (1000 * 60 * 60 * 24));

      const avg = diffs.length ? mean(diffs) : 0;

      console.log(`\n🗂 BIN @ ${new Date(bin.ts).toLocaleDateString()}`);
      console.log("   • reports in this month:", monthReports.length);
      console.log("   • diffs (days):", diffs);
      console.log("   • avg close days:", avg);

      return {
        ts: bin.ts,
        count: diffs.length,
        avg,
      };
    });

    console.log(
      "\n📊 BINS WITH AVG DAYS:",
      bins.map((b) => ({
        month: new Date(b.ts).toLocaleDateString(),
        count: b.count,
        avg: b.avg,
      }))
    );

    const historyAvgs = bins.slice(0, -1).map((b) => b.avg).filter((v) => v > 0);
    const currentBin = bins[bins.length - 1];
    const currentAvg = currentBin.avg;

    console.log("\n📈 HISTORY AVGS (prev months):", historyAvgs);
    console.log(
      "📈 CURRENT BIN:",
      {
        month: new Date(currentBin.ts).toLocaleDateString(),
        count: currentBin.count,
        avg: currentBin.avg,
      }
    );

    if (historyAvgs.length < 2) {
      console.log("⛔ SKIP — not enough history (need ≥ 2 months with avg > 0)");
      continue;
    }

    if (currentAvg === 0) {
      console.log("⛔ SKIP — no resolved reports this month (currentAvg === 0)");
      continue;
    }

    // 4) הכנת bins ל־calcDynamicThreshold (על ממוצעי ימים במקום על count)
    const avgBins = bins.map((b) => ({
      ts: b.ts,
      count: b.avg, // 👈 שמים את ה־avg בשדה count כדי להשתמש בפונקציה הקיימת
    }));

    console.log(
      "\n📦 avgBins passed to calcDynamicThreshold:",
      avgBins.map((b) => ({
        month: new Date(b.ts).toLocaleDateString(),
        pseudoCount: b.count,
      }))
    );

    const { threshold, baselineMean, baselineStd, mode } =
      calcDynamicThreshold(avgBins);

    const μ = baselineMean;
    const σ = baselineStd;

    console.log(
      `\n📌 DYNAMIC THRESHOLD RESULT (mode=${mode}): μ=${μ}, σ=${σ}, threshold=${threshold}, current=${currentAvg}`
    );

    //  כאן אנחנו עובדים על "כמה ימים" ולא על "כמה דיווחים"
    if (currentAvg < threshold) {
      console.log(
        `⛔ SKIP — currentAvg(${currentAvg.toFixed(
          2
        )}) < threshold(${threshold.toFixed(2)})`
      );
      continue;
    }

    // 5) חישובי UI מלאים
    const pct = μ ? ((currentAvg - μ) / μ) * 100 : 100;
    const z = σ ? (currentAvg - μ) / σ : 0;
    const ratio = μ ? currentAvg / μ : 0;
    const currentReports = currentBin.count;

    console.log("\n📊 METRICS FOR UI:");
    console.log("   • currentAvgDays:", currentAvg);
    console.log("   • baselineAvgDays:", μ);
    console.log("   • pctChange:", pct);
    console.log("   • zScore:", z);
    console.log("   • ratio current/μ:", ratio);
    console.log("   • currentReports (this month):", currentReports);

    // 6) בניית אובייקט אנומליה
    const anomaly = buildAnomaly({
      category: type,
      type: "slow_response",
      area,
      title: `זמן טיפול ארוך מהרגיל עבור דיווחי ${type}`,
      description: `זמן הסגירה החודשי עלה ל-${currentAvg.toFixed(
        1
      )} ימים לעומת ממוצע היסטורי של ${μ.toFixed(1)} ימים.`,
      metrics: {
        currentAvgDays: +currentAvg.toFixed(2),
        baselineAvgDays: +μ.toFixed(2),

        currentReports,
        baselineMean: +μ.toFixed(2),
        baselineStd: +σ.toFixed(2),
        threshold: +threshold.toFixed(2),
        pctChange: +pct.toFixed(2),
        zScore: +z.toFixed(2),

        ratio: +ratio.toFixed(2),
        bins,
      },
      relatedReports: items.map((r) => r.id),
      severity: ratio >= 2 ? "high" : "medium",
    });

    anomaly.generalMessage = generateAnomalyDescription(anomaly);

    console.log("\n✅ ANOMALY CREATED:");
    console.log(JSON.stringify(anomaly, null, 2));


    // await saveAnomalyUpdateSnapshot(anomaly);


    anomalies.push(anomaly);
  }

  console.log("\n=====================");
  console.log("🏁 detectSlowResolution DONE");
  console.log("🚨 TOTAL ANOMALIES FOUND:", anomalies.length);
  console.log("=====================\n");

  return anomalies;
}
