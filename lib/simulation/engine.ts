/**
 * Simulation Engine
 * Orchestrates the simulation process
 */

import {
  SimulationConfig,
  SimulationState,
  ReportCategory,
  TimeUnit,
} from "./types";
import { SimulationGenerator } from "./generator";
import { SimulationFirebaseWriter, WriteResult } from "./firebaseWriter";

export type SimulationEventType = 
  | "started"
  | "stopped"
  | "paused"
  | "resumed"
  | "batch_generated"
  | "batch_written"
  | "error"
  | "completed";

export interface SimulationEvent {
  type: SimulationEventType;
  timestamp: number;
  data?: {
    batchSize?: number;
    writeResult?: WriteResult;
    error?: string;
    state?: SimulationState;
  };
}

export type SimulationEventCallback = (event: SimulationEvent) => void;

export class SimulationEngine {
  private config: SimulationConfig | null = null;
  private generator: SimulationGenerator | null = null;
  private writer: SimulationFirebaseWriter;
  private state: SimulationState;
  private intervalId: NodeJS.Timeout | null = null;
  private eventCallbacks: SimulationEventCallback[] = [];

  constructor() {
    this.writer = new SimulationFirebaseWriter();
    this.state = this.createInitialState();
  }

  /**
   * Create initial state
   */
  private createInitialState(): SimulationState {
    const breakdown: Record<ReportCategory, number> = {
      garbage: 0,
      lighting: 0,
      tree: 0,
      hazard: 0,
    };

    return {
      isRunning: false,
      isPaused: false,
      startTime: null,
      endTime: null,
      totalGenerated: 0,
      totalWritten: 0,
      totalErrors: 0,
      categoryBreakdown: breakdown,
      currentBatchSize: 0,
      lastBatchTime: null,
    };
  }

  /**
   * Subscribe to simulation events
   */
  onEvent(callback: SimulationEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to specific events (simplified API)
   */
  on(event: "stateChange" | "statsUpdate" | "log" | "error" | "completed", callback: (data: "idle" | "running" | "paused" | "completed" | { totalGenerated: number; totalWritten: number; totalFailed: number; reportsPerCategory: Record<ReportCategory, number>; startTime: number | null; elapsedSeconds: number; estimatedRemainingSeconds: number; } | string | { message: string } | void) => void): void {
    this.onEvent((simEvent) => {
      // Map internal events to public API
      if (event === "stateChange" && (simEvent.type === "started" || simEvent.type === "stopped" || simEvent.type === "paused" || simEvent.type === "resumed" || simEvent.type === "completed")) {
        // Determine state from event type
        let state: "idle" | "running" | "paused" | "completed" = "idle";
        if (simEvent.type === "started") state = "running";
        else if (simEvent.type === "paused") state = "paused";
        else if (simEvent.type === "resumed") state = "running";
        else if (simEvent.type === "completed") state = "completed";
        else if (simEvent.type === "stopped") state = "idle";
        callback(state);
      } else if (event === "statsUpdate" && simEvent.type === "batch_written") {
        // Calculate stats from current state
        const stats = {
          totalGenerated: this.state.totalGenerated,
          totalWritten: this.state.totalWritten,
          totalFailed: this.state.totalErrors,
          reportsPerCategory: { ...this.state.categoryBreakdown },
          startTime: this.state.startTime,
          elapsedSeconds: this.state.startTime ? Math.floor((Date.now() - this.state.startTime) / 1000) : 0,
          estimatedRemainingSeconds: this.state.endTime ? Math.max(0, Math.floor((this.state.endTime - Date.now()) / 1000)) : 0,
        };
        callback(stats);
      } else if (event === "log") {
        // Emit log messages for all events
        const messages: Record<string, string> = {
          started: `Simulation started`,
          stopped: `Simulation stopped`,
          paused: `Simulation paused`,
          resumed: `Simulation resumed`,
          completed: `Simulation completed`,
          batch_generated: `Generated ${simEvent.data?.batchSize || 0} reports`,
          batch_written: `Written ${simEvent.data?.writeResult?.writtenCount || 0} reports`,
        };
        if (messages[simEvent.type]) {
          callback(messages[simEvent.type]);
        }
      } else if (event === "error" && simEvent.type === "error") {
        callback({ message: simEvent.data?.error || "Unknown error" });
      } else if (event === "completed" && simEvent.type === "completed") {
        callback();
      }
    });
  }

  /**
   * Emit an event
   */
  private emit(type: SimulationEventType, data?: SimulationEvent["data"]): void {
    const event: SimulationEvent = {
      type,
      timestamp: Date.now(),
      data: { ...data, state: { ...this.state } },
    };
    
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error("Event callback error:", error);
      }
    }
  }

  /**
   * Get current state
   */
  getState(): SimulationState {
    return { ...this.state };
  }

  /**
   * Convert duration to milliseconds
   */
  private durationToMs(value: number, unit: TimeUnit): number {
    switch (unit) {
      case "seconds":
        return value * 1000;
      case "minutes":
        return value * 60 * 1000;
      case "hours":
        return value * 60 * 60 * 1000;
      default:
        return value * 60 * 1000;
    }
  }

  /**
   * Start the simulation
   */
  async start(config: SimulationConfig): Promise<void> {
    if (this.state.isRunning) {
      console.warn("Simulation is already running");
      return;
    }

    this.config = config;
    this.generator = new SimulationGenerator(config);
    this.state = this.createInitialState();
    this.state.isRunning = true;
    this.state.startTime = Date.now();
    this.generator.reset();

    this.emit("started");

    const durationMs = this.durationToMs(
      this.config.duration.value,
      this.config.duration.unit
    );
    this.state.endTime = this.state.startTime + durationMs;

    // Calculate interval based on reports per minute
    const intervalMs = 60000 / Math.max(this.config!.reportsPerMinute, 1);

    this.intervalId = setInterval(() => {
      if (this.state.isPaused) return;
      
      // Check if simulation should end
      if (Date.now() >= (this.state.endTime || 0)) {
        this.stop();
        return;
      }

      this.generateAndWriteBatch();
    }, intervalMs);

    // Generate first batch immediately
    await this.generateAndWriteBatch();
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    if (!this.state.isRunning) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.state.isRunning = false;
    this.state.isPaused = false;

    const wasCompleted = Date.now() >= (this.state.endTime || 0);
    this.emit(wasCompleted ? "completed" : "stopped");
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    if (!this.state.isRunning || this.state.isPaused) return;
    
    this.state.isPaused = true;
    this.emit("paused");
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    if (!this.state.isRunning || !this.state.isPaused) return;
    
    this.state.isPaused = false;
    this.emit("resumed");
  }

  /**
   * Generate and write a batch of reports
   */
  private async generateAndWriteBatch(): Promise<void> {
    if (!this.config || !this.generator) {
      this.emit("error", { error: "Simulation not properly initialized" });
      return;
    }

    try {
      // Determine batch size based on mode
      let batchSize = 1;
      
      if (this.config.mode === "burst" && this.config.burstConfig) {
        batchSize = this.config.burstConfig.burstSize;
      } else if (this.config.mode === "pattern" && this.config.patternConfig) {
        const hour = new Date().getHours();
        const multiplier = this.config.patternConfig.hourlyMultipliers[hour] || 1;
        batchSize = Math.max(1, Math.round(multiplier));
      }

      // Generate reports
      const reports = this.generator.generateBatch(batchSize);
      
      this.state.totalGenerated += reports.length;
      this.state.currentBatchSize = reports.length;
      this.state.lastBatchTime = Date.now();

      // Update category breakdown
      for (const report of reports) {
        this.state.categoryBreakdown[report.type]++;
      }

      this.emit("batch_generated", { batchSize: reports.length });

      // Write to Firebase
      const writeResult = await this.writer.writeReports(reports);
      
      this.state.totalWritten += writeResult.writtenCount;
      this.state.totalErrors += writeResult.errors.length;

      this.emit("batch_written", { writeResult });

      if (writeResult.errors.length > 0) {
        this.emit("error", { error: writeResult.errors.join(", ") });
      }
    } catch (error) {
      this.state.totalErrors++;
      this.emit("error", { error: String(error) });
    }
  }
}
