import { groupBy, buildMonthlyBins, calcDynamicThreshold, mean } from "./utils";
import { buildAnomaly, Anomaly } from "./builders";
import { generateAnomalyDescription } from "./anomalyTextGenerator";

export interface Report {
  id: string;
  type: string;
  area: string;
  timestamp: number;
  deleted?: boolean;
  lat?: number;
  lng?: number;
}

export function detectHighActivity(reports: Report[], now = Date.now()): Anomaly[] {
  console.log("=== 🔍 detectHighActivity START ===");
  console.log("📦 Total reports received:", reports.length);

  const active = reports.filter(r => !r.deleted);
  console.log("📦 Active (non deleted) reports:", active.length);

  const groups = groupBy(active, r => `${r.area}___${r.type}`);
  console.log("📚 Total groups (area × type):", groups.size);

  const anomalies: Anomaly[] = [];

  for (const [key, items] of groups) {
    const [area, type] = key.split("___");

    console.log("\n--------------------------------------");
    console.log(`🔎 Checking group: area="${area}", type="${type}"`);
    console.log("📝 Total items in group:", items.length);

    // build monthly bins for last 6 months
    const bins = buildMonthlyBins(items, r => r.timestamp, 6, now);
    console.log("📊 Monthly bins:", bins.map(b => b.count));

    const current = bins[bins.length - 1].count;
    console.log("📌 Current month count:", current);

    const { threshold, baselineMean: μ, baselineStd: σ } = calcDynamicThreshold(bins);
    console.log(`📈 Stats: mean=${μ}, std=${σ}, threshold=${threshold}`);

    // DEBUG rule: if too few historical data
    if (μ === 0 && current === 0) {
      console.log("⚠️ Skipping: No historical activity at all.");
      continue;
    }

    // DEBUG rule: check if spike is real
    if (current < threshold) {
      console.log(`❌ No anomaly: current(${current}) < threshold(${threshold})`);
      continue;
    }
    console.log("✨ Found spike based on threshold!");

    // determine related reports inside this month window
    const start = bins[bins.length - 1].ts;
    const end = start + (bins[1]?.ts ? bins[1].ts - bins[0].ts : 30 * 24 * 60 * 60 * 1000);
    const related = items.filter(r => r.timestamp >= start && r.timestamp < end);
    console.log("📌 Related reports count:", related.length);

    const hasGeo = related.every(r => typeof r.lat === "number" && typeof r.lng === "number");
    const center = hasGeo
      ? {
          lat: mean(related.map(r => r.lat as number)),
          lng: mean(related.map(r => r.lng as number)),
        }
      : null;

    if (!hasGeo) {
      console.log("⚠️ Warning: Some related reports missing coordinates.");
    }

    const pct = μ ? ((current - μ) / μ) * 100 : 100;
    // z is number of standard deviations away from the mean, it helps to understand how unusual the spike is
    const z = (current - μ) / (σ || 1);
    console.log(`📊 pctChange=${pct}%, zScore=${z}`);

    const severity = z >= 3.0 || pct >= 100 ? "high" : "medium";// z>=3 means very rare event 
    console.log("🚨 Creating anomaly entry!");

const anomaly = buildAnomaly({
  category: type,
  type: "spike",
  area,
  title: `ריבוי דיווחי ${type} באזור ${area}`,
  description: `נמצאו ${current} דיווחים בחודש הנוכחי מול ממוצע ${μ.toFixed(
    1
  )} (Z=${z.toFixed(2)}, +${pct.toFixed(0)}%).`,
  metrics: {
    currentReports: current,
    baselineMean: +μ.toFixed(2),
    baselineStd: +σ.toFixed(2),
    threshold: Math.round(threshold),
    pctChange: Math.round(pct),
    zScore: +z.toFixed(2),
    bins,
  },
  relatedReports: related.map((r) => r.id),
  center,
  severity,
});

  // מוסיף את המשפט הדינמי:
  anomaly.generalMessage = generateAnomalyDescription(anomaly);
  anomalies.push(anomaly);

  }

  console.log("=== 🧪 Total anomalies found:", anomalies.length, " ===");
  console.log("=== 🔍 detectHighActivity END ===\n");

  return anomalies;
}
