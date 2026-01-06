export type TimeRange = "month" | "3month" | "6month" | "year" | "custom";
export type AreaAgg = { total: number; resolved: number; unresolved: number; sumDays: number };
export type ReportStatus = "open" | "pending" | "in progress" | "resolved";
export type FilterStatus = ReportStatus | "all";

export interface statusHistoryEntry {
  status: ReportStatus;
  updatedAt: number;
  updatedBy: string;
}












export interface SlowResponseMetrics {
  currentAvgDays: number;
  baselineAvgDays: number;

  currentReports: number;
  baselineMean: number;
  baselineStd: number;
  threshold: number;
  pctChange: number;
  zScore: number;
  ratio: number;

  bins: {
    ts: number;
    count: number;
    avg: number;
  }[];
}


export interface AnomalyUpdateSnapshot {
  timestamp: number;

  id: string;
  category: string;
  area: string;
  type: string;
  status: string;
  severity: string;

  title: string;
  description: string;
  generalMessage?: string | null;

  metrics: SlowResponseMetrics;
  relatedReports: string[];

  center?: { lat: number; lng: number } | null;

  firstDetected: number;
  lastUpdated: number;
}


export interface ReportImage {
  url: string;
  fileName: string;
  uploadedAt: number;
}

export interface Report {
  resolvedAt: number;
  id?: string;
  area: string;
  description: string;
  lat: number;
  lng: number;
  address?: string; 
  status: ReportStatus;
  timestamp: number;
  type?: string;
  media?: boolean;
  submittedBy?: string;
  email?: string;
  phone?: string;
  mediaUrl?: string;
  images?: ReportImage[]; // New: Array of image metadata
  statusHistory: statusHistoryEntry[];
  updatedBy?: string;    
  updatedAt?: number;   
  deleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;
}




export interface AnomalyBin {
  ts: number;
  count: number;
}

export type AnomalyType =
  | "spike"            // ריבוי דיווחים פתאומי
  | "trend"            // עלייה מתמשכת
  | "drop"
  //
  | "slow_response"    // זמן טיפול ארוך
  | "unclosed_cases"   // ריבוי תקלות שלא נסגרו
  | "geo_cluster"      // ריכוז דיווחים נקודתי
  | "delay"            // איחור מצטבר
  | "custom";          // כל דבר עתידי
export interface AnomalyMetrics {
  currentAvgDays: number;
  currentReports: number;
  baselineMean: number;
  baselineStd: number;
  threshold: number;
  pctChange: number;
  zScore: number;
  bins: AnomalyBin[];
  // geo_cluster specific metrics
  cellsInvolved?: number;
  radiusMeters?: number;
  maxZScore?: number;
  // slow_response specific metrics
  baselineAvgDays?: number;
  ratio?: number;
  [x: string]: number | AnomalyBin[] | undefined;
}

export interface Anomaly {
  firebaseKey: string; 
  id: string;
  generalMessage?: string;  
  category: string;
  type: AnomalyType;
  area: string;
  title: string;
  description: string;
  metrics: AnomalyMetrics;
  severity: "low" | "medium" | "high";
  relatedReports: string[];
  center?: {
    lat: number;
    lng: number;
  };
  firstDetected: number ;
  lastUpdated: number;
  status: string;
  reviewedBy?: {
    [emailKey: string]: number; // timestamp
  };
}







export type City = {
  city: string;
  district: string;
  coordinates: { lat: number; lng: number }[]; //coordinate is array of objects, each one have lat,lng
//   "coordinates": [
//   { "lat": 29.57, "lng": 34.97 },
//   { "lat": 29.56, "lng": 34.98 }
// ]
};

export interface Graph {
  data?: { month: string; reports: number; resolved?: number; avgDays?: number }[];
  id: number;
  type: "line" | "bar" | "double";
  category: "garbage" | "lighting" | "tree" | "hazard";
  timeRange: "month" | "3month" | "6month" | "year";
  from?: string;
  to?: string;
  topic: "frequency" | "avgResolve" | "resolvedVsTotal" | "unresolved";

}

export interface AreaStats {
  area: string;
  total: number;
  unresolvedPercent: string;
  avgResolveDays: string | "—";
}

export interface CategoryStats {
  category: string;
  avgResolveDays: string | "—";
}

export interface DetailedStats {
  topAreas: AreaStats[];
  topUnresolvedAreas: AreaStats[];
  topAreasByResolveTime: AreaStats[];
  topCategoriesByResolveTime: CategoryStats[];
}