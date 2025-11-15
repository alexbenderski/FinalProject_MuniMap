
export type ReportStatus = "open" | "pending" | "in progress" | "resolved";
export interface AnomalyMetrics {
  [key: string]: number | string | unknown;
}

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