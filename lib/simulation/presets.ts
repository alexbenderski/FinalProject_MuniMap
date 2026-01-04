/**
 * Simulation Presets
 * Pre-configured simulation scenarios for common testing needs
 */

import { SimulationConfig, SimulationPreset } from "./types";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SimulationConfig = {
  mode: "random",
  duration: { value: 5, unit: "minutes" },
  reportsPerMinute: 3,
  categories: ["garbage", "lighting", "tree", "hazard"],
  cityName: "Tel Aviv",
  useRandomLocations: true,
  includeResolvedReports: false,
  avgResolutionDays: 3,
  statusDistribution: {
    open: 60,
    pending: 20,
    inProgress: 15,
    resolved: 5,
  },
};

/**
 * Pre-defined simulation presets
 */
export const SIMULATION_PRESETS: SimulationPreset[] = [
  {
    id: "random-light",
    name: "🎲 Random Traffic (Light)",
    description: "Equal distribution across all categories, 3 reports/minute for 5 minutes",
    config: {
      mode: "random",
      duration: { value: 5, unit: "minutes" },
      reportsPerMinute: 3,
      categories: ["garbage", "lighting", "tree", "hazard"],
      useRandomLocations: true,
      includeResolvedReports: false,
    },
  },
  {
    id: "random-heavy",
    name: "🎲 Random Traffic (Heavy)",
    description: "High volume random traffic, 20 reports/minute for 10 minutes",
    config: {
      mode: "random",
      duration: { value: 10, unit: "minutes" },
      reportsPerMinute: 20,
      categories: ["garbage", "lighting", "tree", "hazard"],
      useRandomLocations: true,
      includeResolvedReports: false,
    },
  },
  {
    id: "burst",
    name: "💥 Burst Traffic",
    description: "Sudden spikes of 15 reports every 30 seconds",
    config: {
      mode: "burst",
      duration: { value: 5, unit: "minutes" },
      reportsPerMinute: 30,
      categories: ["garbage", "lighting", "tree", "hazard"],
      burstConfig: {
        burstSize: 15,
        burstInterval: 30,
        burstDuration: 5,
      },
      useRandomLocations: true,
      includeResolvedReports: false,
    },
  },
  {
    id: "garbage-heavy",
    name: "🗑️ Garbage Heavy",
    description: "70% garbage reports, simulates waste management crisis",
    config: {
      mode: "controlled",
      duration: { value: 10, unit: "minutes" },
      reportsPerMinute: 10,
      categories: ["garbage", "lighting", "tree", "hazard"],
      categoryWeights: [
        { category: "garbage", weight: 70 },
        { category: "lighting", weight: 15 },
        { category: "tree", weight: 10 },
        { category: "hazard", weight: 5 },
      ],
      useRandomLocations: true,
      includeResolvedReports: false,
    },
  },
  {
    id: "lighting-heavy",
    name: "💡 Lighting Heavy",
    description: "60% lighting reports, simulates power outage scenario",
    config: {
      mode: "controlled",
      duration: { value: 10, unit: "minutes" },
      reportsPerMinute: 10,
      categories: ["garbage", "lighting", "tree", "hazard"],
      categoryWeights: [
        { category: "garbage", weight: 15 },
        { category: "lighting", weight: 60 },
        { category: "tree", weight: 15 },
        { category: "hazard", weight: 10 },
      ],
      useRandomLocations: true,
      includeResolvedReports: false,
    },
  },
  {
    id: "hazard-crisis",
    name: "⚠️ Hazard Crisis",
    description: "High hazard reports after storm or disaster",
    config: {
      mode: "controlled",
      duration: { value: 15, unit: "minutes" },
      reportsPerMinute: 15,
      categories: ["garbage", "lighting", "tree", "hazard"],
      categoryWeights: [
        { category: "garbage", weight: 10 },
        { category: "lighting", weight: 20 },
        { category: "tree", weight: 30 },
        { category: "hazard", weight: 40 },
      ],
      useRandomLocations: true,
      includeResolvedReports: false,
    },
  },
  {
    id: "realistic-day",
    name: "🌅 Realistic Day Pattern",
    description: "Time-based pattern simulating a typical day",
    config: {
      mode: "pattern",
      duration: { value: 1, unit: "hours" },
      reportsPerMinute: 5,
      categories: ["garbage", "lighting", "tree", "hazard"],
      patternConfig: {
        // More reports during day hours, fewer at night
        hourlyMultipliers: [
          0.2, 0.1, 0.1, 0.1, 0.2, 0.3, // 00-05
          0.5, 0.8, 1.2, 1.5, 1.8, 2.0, // 06-11
          1.5, 1.8, 2.0, 2.0, 1.8, 1.5, // 12-17
          1.2, 1.0, 0.8, 0.6, 0.4, 0.3, // 18-23
        ],
      },
      useRandomLocations: true,
      includeResolvedReports: false,
    },
  },
  {
    id: "with-resolutions",
    name: "✅ With Resolved Reports",
    description: "Includes resolved reports for testing analytics",
    config: {
      mode: "random",
      duration: { value: 10, unit: "minutes" },
      reportsPerMinute: 5,
      categories: ["garbage", "lighting", "tree", "hazard"],
      useRandomLocations: true,
      includeResolvedReports: true,
      avgResolutionDays: 3,
      statusDistribution: {
        open: 40,
        pending: 25,
        inProgress: 20,
        resolved: 15,
      },
    },
  },
  {
    id: "stress-test",
    name: "🔥 Stress Test",
    description: "Maximum load: 60 reports/minute for 30 minutes",
    config: {
      mode: "random",
      duration: { value: 30, unit: "minutes" },
      reportsPerMinute: 60,
      categories: ["garbage", "lighting", "tree", "hazard"],
      useRandomLocations: true,
      includeResolvedReports: false,
    },
  },
  {
    id: "quick-test",
    name: "⚡ Quick Test",
    description: "Fast test: 10 reports in 30 seconds",
    config: {
      mode: "random",
      duration: { value: 30, unit: "seconds" },
      reportsPerMinute: 20,
      categories: ["garbage", "lighting", "tree", "hazard"],
      useRandomLocations: true,
      includeResolvedReports: false,
    },
  },
];

/**
 * Get a preset by ID
 */
export function getPreset(id: string): SimulationPreset | undefined {
  return SIMULATION_PRESETS.find(p => p.id === id);
}

/**
 * Merge preset config with defaults
 */
export function applyPreset(presetId: string): SimulationConfig {
  const preset = getPreset(presetId);
  if (!preset) {
    return { ...DEFAULT_CONFIG };
  }
  return { ...DEFAULT_CONFIG, ...preset.config };
}
