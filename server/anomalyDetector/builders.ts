// builds a standard anomaly object

export interface AnomalyMetrics {
  [key: string]: number | string | unknown;
}
export type AnomalyType = "spike" | "drop" | "trend" | "coldspot";

export interface Anomaly {
  id: string;
  category: string;
  type: AnomalyType;
  area: string;
  title: string;
  description: string;
  metrics: AnomalyMetrics;
  relatedReports: string[];
  severity: "medium" | "high";
  status: "open" | "closed";
  firstDetected: number ;
  lastUpdated: number;
  center?: { lat: number; lng: number } | null;
}

export function buildAnomalyId({
  category,
  area,
  type,
}: {
  category: string;
  area: string;
  type: AnomalyType;
}): string {
  const safeArea = area.replace(/\s+/g, "_");
  const safeType = type.replace(/\s+/g, "_");
  return `anom_${category}_${safeArea}_${safeType}`;
}

export function buildAnomaly(params: {
  category: string;
  type: AnomalyType;
  area: string;
  title: string;
  description: string;
  metrics: AnomalyMetrics;
  relatedReports: string[];
  center?: { lat: number; lng: number } | null;
  severity?: "medium" | "high";
}): Anomaly {
  const {
    category,
    type,
    area,
    title,
    description,
    metrics,
    relatedReports,
    center = null,
    severity = "medium",
  } = params;

  return {
    id: buildAnomalyId({ category, area, type }),
    category,
    type,
    area,
    title,
    description,
    metrics,
    relatedReports,
    severity,
    status: "open",
    firstDetected: Date.now(),   // ← חדש
    lastUpdated: Date.now(),     // ← חדש
    center,
  };
}