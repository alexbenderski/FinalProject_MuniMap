/**
 * Simulation Server Types
 * Configuration and state types for the municipal report simulator
 */

export type ReportCategory = "garbage" | "lighting" | "tree" | "hazard" | "animal" | "maintenance" | "pest";

export type GenerationMode = "random" | "controlled" | "burst" | "pattern";

export type TimeUnit = "seconds" | "minutes" | "hours";

export interface CategoryWeight {
  category: ReportCategory;
  weight: number; // 0-100, percentage weight for random mode
  fixedCount?: number; // Fixed count for controlled mode
}

export interface LocationBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface BurstConfig {
  burstSize: number; // Reports per burst
  burstInterval: number; // Seconds between bursts
  burstDuration: number; // How long each burst lasts in seconds
}

export interface PatternConfig {
  // Hour-based multipliers (0-23)
  hourlyMultipliers: number[];
  // Day-based multipliers (0-6, Sunday-Saturday)
  dailyMultipliers?: number[];
}

export interface SimulationConfig {
  // Basic settings
  mode: GenerationMode;
  duration: {
    value: number;
    unit: TimeUnit;
  };
  
  // Rate settings
  reportsPerMinute: number;
  
  // Category settings
  categories: ReportCategory[];
  categoryWeights?: CategoryWeight[];
  
  // Location settings
  cityName: string;
  cityBoundary?: { lat: number; lng: number }[];
  useRandomLocations: boolean;
  
  // Mode-specific settings
  burstConfig?: BurstConfig;
  patternConfig?: PatternConfig;
  
  // Advanced settings
  seed?: number; // For reproducible runs
  statusDistribution?: {
    open: number;
    pending: number;
    inProgress: number;
    resolved: number;
  };
  
  // Include resolved reports with realistic timestamps
  includeResolvedReports: boolean;
  avgResolutionDays: number;
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  endTime: number | null;
  
  // Statistics
  totalGenerated: number;
  totalWritten: number;
  totalErrors: number;
  categoryBreakdown: Record<ReportCategory, number>;
  
  // Current batch info
  currentBatchSize: number;
  lastBatchTime: number | null;
}

export interface SimulationPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<SimulationConfig>;
}

export interface StatusHistoryEntry {
  status: "open" | "pending" | "in progress" | "resolved";
  updatedAt: number;
  updatedBy: string;
}

export interface GeneratedReport {
  id: string;
  type: ReportCategory;
  description: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  status: "open" | "pending" | "in progress" | "resolved";
  timestamp: number;
  openedAt?: number;
  pendingAt?: number;
  inProgressAt?: number;
  resolvedAt?: number;
  deleted: boolean;
  email: string;
  phone: string;
  media: boolean;
  submittedBy: string;
  updatedAt: number;
  updatedBy: string;
  statusHistory: StatusHistoryEntry[];
}
