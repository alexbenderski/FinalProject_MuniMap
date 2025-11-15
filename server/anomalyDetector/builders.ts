// builds a standard anomaly object

export interface AnomalyMetrics {
  [key: string]: number | string | unknown;
}

export interface Anomaly {
  id: string;
  category: string;
  type: string;
  area: string;
  title: string;
  description: string;
  metrics: AnomalyMetrics;
  relatedReports: string[];
  severity: "medium" | "high";
  status: "open" | "closed";
  detectedAt: number;
  center?: { lat: number; lng: number } | null;
}

export function buildAnomalyId({
  category,
  area,
  type,
}: {
  category: string;
  area: string;
  type: string;
}): string {
  const safeArea = area.replace(/\s+/g, "_");
  const safeType = type.replace(/\s+/g, "_");
  return `anom_${category}_${safeArea}_${safeType}_${Date.now()}`;
}

export function buildAnomaly(params: {
  category: string;
  type: string;
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
    detectedAt: Date.now(),
    center,
  };
}
