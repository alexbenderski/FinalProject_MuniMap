/**
 * Reports Store Hook
 * Provides a stable, decoupled data layer that doesn't cause unnecessary re-renders
 * when simulation or other data sources write to the database.
 * 
 * Key features:
 * - Incremental updates using Firebase child listeners
 * - Batched notifications to prevent render storms
 * - Filter matching utility to check if updates affect visible data
 * - Stable reference to prevent re-renders in parent components
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { Report } from "@/lib/types";
import { getDatabase, ref, onChildAdded, onChildChanged, onChildRemoved, onValue, off, DataSnapshot } from "firebase/database";
import { app } from "../firebase";

/**
 * Hook that provides stable reports data with incremental updates
 * Only triggers re-renders when filtered data actually changes
 */
export function useReportsStore(
  city: string | null,
  filters?: {
    selectedTypes: string[];
    statusList?: string[];
    status?: string;
    dateFrom: string | null;
    dateTo: string | null;
    mediaOnly: boolean;
    criticalityList?: string[];
    criticality?: string;
    filtersApplied: boolean;
  }
) {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const reportsMapRef = useRef<Map<string, Report>>(new Map());
  const initialLoadDoneRef = useRef(false);
  const pendingUpdateRef = useRef(false);

  // Store filter values in ref to avoid re-subscribing on filter changes
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Batch notifications to prevent render storms
  const scheduleUpdate = useCallback(() => {
    if (pendingUpdateRef.current) return;
    pendingUpdateRef.current = true;

    queueMicrotask(() => {
      pendingUpdateRef.current = false;
      const allReports = Array.from(reportsMapRef.current.values());
      setReports(allReports);
    });
  }, []);

  // Subscribe to Firebase
  useEffect(() => {
    if (!city) return;

    const db = getDatabase(app);
    const reportsRef = ref(db, "Reports");
    const unsubscribers: (() => void)[] = [];

    // Initial load
    const initialLoadHandler = (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) {
        initialLoadDoneRef.current = true;
        scheduleUpdate();
        return;
      }

      const data = snapshot.val();
      reportsMapRef.current.clear();

      Object.entries(data).forEach(([type, group]) => {
        if (group && typeof group === "object") {
          Object.entries(group as Record<string, Omit<Report, "type" | "id">>).forEach(
            ([id, report]) => {
              const fullReport: Report = { ...report, type, id } as Report;
              if (!fullReport.deleted && fullReport.area === city) {
                reportsMapRef.current.set(`${type}/${id}`, fullReport);
              }
            }
          );
        }
      });

      initialLoadDoneRef.current = true;
      scheduleUpdate();
    };

    // Fire once for initial load
    onValue(reportsRef, initialLoadHandler, { onlyOnce: true });

    // Set up incremental listeners for each category
    const categories = ["garbage", "lighting", "tree", "hazard"];
    
    categories.forEach(category => {
      const categoryRef = ref(db, `Reports/${category}`);
      
      // Listen for new reports (skip if initial load not done)
      onChildAdded(categoryRef, (snapshot) => {
        if (!initialLoadDoneRef.current) return;
        
        const id = snapshot.key;
        if (!id) return;
        
        const report = snapshot.val() as Omit<Report, "type" | "id">;
        if (report.deleted) return;
        
        const fullReport: Report = { ...report, type: category, id } as Report;
        
        // Only add if it matches our city filter
        if (fullReport.area === city) {
          const key = `${category}/${id}`;
          reportsMapRef.current.set(key, fullReport);
          scheduleUpdate();
        }
      });

      // Listen for changed reports
      onChildChanged(categoryRef, (snapshot) => {
        const id = snapshot.key;
        if (!id) return;
        
        const report = snapshot.val() as Omit<Report, "type" | "id">;
        const fullReport: Report = { ...report, type: category, id } as Report;
        const key = `${category}/${id}`;
        
        if (report.deleted) {
          if (reportsMapRef.current.has(key)) {
            reportsMapRef.current.delete(key);
            scheduleUpdate();
          }
        } else if (fullReport.area === city) {
          reportsMapRef.current.set(key, fullReport);
          scheduleUpdate();
        }
      });

      // Listen for removed reports
      onChildRemoved(categoryRef, (snapshot) => {
        const id = snapshot.key;
        if (!id) return;
        
        const key = `${category}/${id}`;
        if (reportsMapRef.current.has(key)) {
          reportsMapRef.current.delete(key);
          scheduleUpdate();
        }
      });

      unsubscribers.push(() => {
        off(categoryRef, "child_added");
        off(categoryRef, "child_changed");
        off(categoryRef, "child_removed");
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
      // Copy ref to local variable for cleanup
      const mapToClean = reportsMapRef.current;
      mapToClean.clear();
      initialLoadDoneRef.current = false;
    };
  }, [city, scheduleUpdate]);

  // Apply filters when reports or filters change
  useEffect(() => {
    if (!filters || !filters.filtersApplied) {
      setFilteredReports([]);
      return;
    }

    const filtered = reports.filter(report => {
      // Type match
      if (filters.selectedTypes.length > 0 && !filters.selectedTypes.includes(report.type ?? "")) {
        return false;
      }

      // Status match
      if (filters.statusList && filters.statusList.length > 0) {
        if (!filters.statusList.includes(report.status)) return false;
      } else if (filters.status && filters.status !== "all") {
        if (filters.status === "all" && report.status === "resolved") return false;
        else if (report.status !== filters.status) return false;
      } else {
        // Default: exclude resolved
        if (report.status === "resolved") return false;
      }

      // Date match
      if (filters.dateFrom) {
        const fromMs = new Date(filters.dateFrom).getTime();
        if (report.timestamp < fromMs) return false;
      }
      if (filters.dateTo) {
        const toMs = new Date(filters.dateTo).getTime();
        if (report.timestamp > toMs) return false;
      }

      // Media match
      if (filters.mediaOnly && !report.media) return false;

      return true;
    });

    setFilteredReports(filtered);
  }, [reports, filters]);

  return {
    reports,
    filteredReports,
    isLoading: !initialLoadDoneRef.current,
  };
}

/**
 * Check if a report matches the current filter criteria
 * Useful for determining if an incoming report should trigger UI updates
 */
export function reportMatchesFilters(
  report: Report,
  city: string | null,
  filters: {
    selectedTypes: string[];
    statusList?: string[];
    status?: string;
    dateFrom: string | null;
    dateTo: string | null;
    mediaOnly: boolean;
    filtersApplied: boolean;
  }
): boolean {
  // Must match city
  if (city && report.area !== city) return false;
  
  // If filters not applied, no match
  if (!filters.filtersApplied) return false;
  
  // Type match
  if (filters.selectedTypes.length > 0 && !filters.selectedTypes.includes(report.type ?? "")) {
    return false;
  }

  // Status match
  if (filters.statusList && filters.statusList.length > 0) {
    if (!filters.statusList.includes(report.status)) return false;
  } else if (filters.status && filters.status !== "all") {
    if (report.status !== filters.status) return false;
  }

  // Date match
  if (filters.dateFrom) {
    const fromMs = new Date(filters.dateFrom).getTime();
    if (report.timestamp < fromMs) return false;
  }
  if (filters.dateTo) {
    const toMs = new Date(filters.dateTo).getTime();
    if (report.timestamp > toMs) return false;
  }

  // Media match
  if (filters.mediaOnly && !report.media) return false;

  return true;
}
