export type TimeRange = "month" | "3month" | "6month" | "year" | "custom";
export type AreaAgg = { total: number; resolved: number; unresolved: number; sumDays: number };
export type ReportStatus = "open" | "pending" | "in progress" | "resolved";
export type FilterStatus = ReportStatus | "all";

export interface statusHistoryEntry {
  status: ReportStatus;
  updatedAt: number;
  updatedBy: string;
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
  statusHistory: statusHistoryEntry[];
  updatedBy?: string;    
  updatedAt?: number;   
  deleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;
}


//// old Anomaly:
// export interface Anomaly {
//   id: string;
//   type: string;
//   area: string;
//   title: string;
//   count: number;
//   days: number;
//   lastTimestamp: number;
//   status: string;
//   relatedReports: string[];
//   createdAt: number;
//   details?: {
//     currentAvg?: number;
//     prevAvg?: number;
//     changePercent?: number;
//     reason?: string;
//   };
//   reviewedBy?: {
//     [emailKey: string]: number; // כאן כל מפתח הוא אימייל עם "_" והערך הוא timestamp
//   };
// }

export interface AnomalyBin {
  ts: number;
  count: number;
}
export type AnomalyType = "spike" | "drop" | "trend" | "coldspot";

export interface AnomalyMetrics {
  currentReports: number;
  baselineMean: number;
  baselineStd: number;
  threshold: number;
  pctChange: number;
  zScore: number;
  bins: AnomalyBin[];
}

export interface Anomaly {
  firebaseKey: string; 
  id: string;
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
  category: "garbage" | "lighting" | "tree";
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