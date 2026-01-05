"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  SimulationConfig,
  ReportCategory,
  GenerationMode,
} from "@/lib/simulation/types";
import { SimulationEngine } from "@/lib/simulation/engine";
import { SIMULATION_PRESETS, DEFAULT_CONFIG, applyPreset } from "@/lib/simulation/presets";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface SimulationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cityName?: string;
  cityBoundary?: number[][];
}

type TabType = "presets" | "custom" | "monitor";

type SimulationStatus = "idle" | "running" | "paused" | "completed";

interface SimulationStats {
  totalGenerated: number;
  totalWritten: number;
  totalFailed: number;
  reportsPerCategory: Record<string, number>;
  startTime: number | null;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
}

const CATEGORY_ICONS: Record<ReportCategory, string> = {
  garbage: "🗑️",
  lighting: "💡",
  tree: "🌳",
  hazard: "⚠️",
};

const CATEGORY_LABELS: Record<ReportCategory, { en: string; he: string }> = {
  garbage: { en: "Garbage", he: "אשפה" },
  lighting: { en: "Lighting", he: "תאורה" },
  tree: { en: "Trees", he: "עצים" },
  hazard: { en: "Hazards", he: "מפגעים" },
};

export default function SimulationPanel({
  isOpen,
  onClose,
  cityName = "Tel Aviv",
  cityBoundary,
}: SimulationPanelProps) {
  const { language } = useLanguage();
  const isHebrew = language === "he";

  // State
  const [activeTab, setActiveTab] = useState<TabType>("presets");
  const [config, setConfig] = useState<SimulationConfig>({ ...DEFAULT_CONFIG, cityName });
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [engine, setEngine] = useState<SimulationEngine | null>(null);
  const [state, setState] = useState<SimulationStatus>("idle");
  const [stats, setStats] = useState<SimulationStats>({
    totalGenerated: 0,
    totalWritten: 0,
    totalFailed: 0,
    reportsPerCategory: {},
    startTime: null,
    elapsedSeconds: 0,
    estimatedRemainingSeconds: 0,
  });
  const [logs, setLogs] = useState<string[]>([]);

  // Initialize engine
  useEffect(() => {
    const newEngine = new SimulationEngine();
    
    // Set up event handlers
    newEngine.on("stateChange", (newState) => setState(newState as SimulationStatus));
    newEngine.on("statsUpdate", (newStats) => setStats(newStats as SimulationStats));
    newEngine.on("log", (message) => {
      setLogs(prev => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${message as string}`]);
    });
    newEngine.on("error", (error) => {
      setLogs(prev => [...prev.slice(-100), `[ERROR] ${(error as { message: string }).message}`]);
    });
    
    setEngine(newEngine);
    
    return () => {
      newEngine.stop();
    };
  }, []);

  // Apply preset
  const handlePresetSelect = useCallback((presetId: string) => {
    setSelectedPresetId(presetId);
    const presetConfig = applyPreset(presetId);
    // Convert cityBoundary from number[][] to { lat, lng }[]
    const convertedBoundary = cityBoundary?.map(([lat, lng]) => ({ lat, lng }));
    setConfig({ ...presetConfig, cityName, cityBoundary: convertedBoundary });
  }, [cityName, cityBoundary]);

  // Control handlers
  const handleStart = useCallback(async () => {
    if (!engine) return;
    setLogs([]);
    // Convert cityBoundary from number[][] to { lat, lng }[]
    const convertedBoundary = cityBoundary?.map(([lat, lng]) => ({ lat, lng }));
    await engine.start({ ...config, cityName, cityBoundary: convertedBoundary });
  }, [engine, config, cityName, cityBoundary]);

  const handleStop = useCallback(() => {
    engine?.stop();
  }, [engine]);

  const handlePause = useCallback(() => {
    engine?.pause();
  }, [engine]);

  const handleResume = useCallback(() => {
    engine?.resume();
  }, [engine]);

  // Config updates
  const updateConfig = useCallback(<K extends keyof SimulationConfig>(
    key: K,
    value: SimulationConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSelectedPresetId(null); // Clear preset when manually editing
  }, []);

  const toggleCategory = useCallback((category: ReportCategory) => {
    setConfig(prev => {
      const categories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories };
    });
    setSelectedPresetId(null);
  }, []);

  // Calculate progress
  const getDurationSeconds = () => {
    const { value, unit } = config.duration;
    switch (unit) {
      case "seconds": return value;
      case "minutes": return value * 60;
      case "hours": return value * 3600;
      default: return value * 60;
    }
  };

  const progress = getDurationSeconds() > 0 
    ? Math.min(100, (stats.elapsedSeconds / getDurationSeconds()) * 100)
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="relative w-[900px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={{ direction: isHebrew ? "rtl" : "ltr" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl">
              🧪
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isHebrew ? "סימולטור דיווחים" : "Report Simulator"}
              </h2>
              <p className="text-xs text-gray-600">
                {isHebrew ? "בדיקת מערכת עם דיווחים מדומים" : "Test system with simulated reports"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 hover:text-gray-900 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(["presets", "custom", "monitor"] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab === "presets" && (isHebrew ? "תבניות מוכנות" : "Presets")}
              {tab === "custom" && (isHebrew ? "הגדרות מותאמות" : "Custom Settings")}
              {tab === "monitor" && (isHebrew ? "מעקב" : "Monitor")}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Presets Tab */}
          {activeTab === "presets" && (
            <div className="grid grid-cols-2 gap-3">
              {SIMULATION_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`p-4 rounded-xl text-left transition-all ${
                    selectedPresetId === preset.id
                      ? "bg-purple-100 border-2 border-purple-500 shadow-lg shadow-purple-500/20"
                      : "bg-gray-50 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-base font-semibold text-gray-900 mb-1">{preset.name}</div>
                  <div className="text-xs text-gray-600">{preset.description}</div>
                </button>
              ))}
            </div>
          )}

          {/* Custom Settings Tab */}
          {activeTab === "custom" && (
            <div className="space-y-6">
              {/* Generation Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {isHebrew ? "מצב יצירה" : "Generation Mode"}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["random", "controlled", "burst", "pattern"] as GenerationMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => updateConfig("mode", mode)}
                      className={`py-2 px-3 rounded-lg text-sm transition-all ${
                        config.mode === mode
                          ? "bg-purple-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {mode === "random" && "🎲 Random"}
                      {mode === "controlled" && "⚙️ Controlled"}
                      {mode === "burst" && "💥 Burst"}
                      {mode === "pattern" && "📊 Pattern"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {isHebrew ? "משך סימולציה" : "Simulation Duration"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={config.duration.value}
                    onChange={(e) => updateConfig("duration", { ...config.duration, value: parseInt(e.target.value) || 1 })}
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                  />
                  <select
                    value={config.duration.unit}
                    onChange={(e) => updateConfig("duration", { ...config.duration, unit: e.target.value as "seconds" | "minutes" | "hours" })}
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                  >
                    <option value="seconds">{isHebrew ? "שניות" : "Seconds"}</option>
                    <option value="minutes">{isHebrew ? "דקות" : "Minutes"}</option>
                    <option value="hours">{isHebrew ? "שעות" : "Hours"}</option>
                  </select>
                </div>
              </div>

              {/* Reports per minute */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {isHebrew ? "דיווחים לדקה" : "Reports per Minute"}: {config.reportsPerMinute}
                </label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={config.reportsPerMinute}
                  onChange={(e) => updateConfig("reportsPerMinute", parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>1</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {isHebrew ? "קטגוריות" : "Categories"}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["garbage", "lighting", "tree", "hazard"] as ReportCategory[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`py-3 px-3 rounded-lg text-sm transition-all ${
                        config.categories.includes(cat)
                          ? "bg-green-100 border border-green-500 text-green-700"
                          : "bg-gray-100 border border-gray-300 text-gray-600"
                      }`}
                    >
                      <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                      <span className="block mt-1">{CATEGORY_LABELS[cat][isHebrew ? "he" : "en"]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Include Resolved Reports */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {isHebrew ? "כלול דיווחים שנפתרו" : "Include Resolved Reports"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {isHebrew ? "לבדיקת ניתוח נתונים" : "For analytics testing"}
                  </div>
                </div>
                <button
                  onClick={() => updateConfig("includeResolvedReports", !config.includeResolvedReports)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    config.includeResolvedReports ? "bg-purple-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      config.includeResolvedReports ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Monitor Tab */}
          {activeTab === "monitor" && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between text-sm text-gray-700 mb-2">
                  <span>{isHebrew ? "התקדמות" : "Progress"}</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-2">
                  <span>{Math.floor(stats.elapsedSeconds / 60)}:{String(stats.elapsedSeconds % 60).padStart(2, '0')}</span>
                  <span>{Math.ceil(stats.estimatedRemainingSeconds / 60)}:{String(Math.ceil(stats.estimatedRemainingSeconds) % 60).padStart(2, '0')} {isHebrew ? "נותרו" : "remaining"}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.totalGenerated}</div>
                  <div className="text-xs text-gray-600">{isHebrew ? "נוצרו" : "Generated"}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalWritten}</div>
                  <div className="text-xs text-gray-600">{isHebrew ? "נכתבו" : "Written"}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.totalFailed}</div>
                  <div className="text-xs text-gray-600">{isHebrew ? "נכשלו" : "Failed"}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.elapsedSeconds > 0 
                      ? ((stats.totalWritten / stats.elapsedSeconds) * 60).toFixed(1)
                      : "0"}
                  </div>
                  <div className="text-xs text-gray-600">{isHebrew ? "לדקה" : "/min"}</div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm font-medium text-gray-900 mb-3">
                  {isHebrew ? "פילוח לפי קטגוריה" : "Category Breakdown"}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {(["garbage", "lighting", "tree", "hazard"] as ReportCategory[]).map(cat => (
                    <div key={cat} className="text-center">
                      <div className="text-2xl mb-1">{CATEGORY_ICONS[cat]}</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {stats.reportsPerCategory[cat] || 0}
                      </div>
                      <div className="text-xs text-gray-600">
                        {CATEGORY_LABELS[cat][isHebrew ? "he" : "en"]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logs */}
              <div className="p-4 bg-gray-100 rounded-xl">
                <div className="text-sm font-medium text-gray-900 mb-2">
                  {isHebrew ? "לוג פעילות" : "Activity Log"}
                </div>
                <div className="h-40 overflow-y-auto font-mono text-xs text-gray-700 space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-gray-500 italic">
                      {isHebrew ? "אין פעילות עדיין..." : "No activity yet..."}
                    </div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className={log.includes("ERROR") ? "text-red-600" : ""}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Controls */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                state === "running" ? "bg-green-500 animate-pulse" :
                state === "paused" ? "bg-yellow-500" :
                state === "completed" ? "bg-blue-500" :
                "bg-gray-400"
              }`} />
              <span className="text-sm text-gray-700 capitalize">{state}</span>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2">
              {state === "idle" || state === "completed" ? (
                <button
                  onClick={handleStart}
                  disabled={config.categories.length === 0}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isHebrew ? "התחל סימולציה" : "Start Simulation"}
                </button>
              ) : state === "running" ? (
                <>
                  <button
                    onClick={handlePause}
                    className="px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 font-medium rounded-lg hover:bg-yellow-500/30 transition-colors"
                  >
                    {isHebrew ? "השהה" : "Pause"}
                  </button>
                  <button
                    onClick={handleStop}
                    className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 font-medium rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    {isHebrew ? "עצור" : "Stop"}
                  </button>
                </>
              ) : state === "paused" ? (
                <>
                  <button
                    onClick={handleResume}
                    className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/50 font-medium rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    {isHebrew ? "המשך" : "Resume"}
                  </button>
                  <button
                    onClick={handleStop}
                    className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 font-medium rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    {isHebrew ? "עצור" : "Stop"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
