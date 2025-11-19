// lib/server/sla.ts

import {Report} from "@/lib/types";

export function getReportCriticality(report: Report) {
  const now = Date.now();
  //calculate how much days the report is open.
  //(1000 * 60 * 60 * 24) to convert milisec to days.
  const ageDays = Math.floor((now - report.timestamp) / (1000 * 60 * 60 * 24));
  //SLA is the max time that report should be open before its done.
  const typeKey = report.type ?? "general"; 
  const sla = SLA_DAYS[typeKey] ?? 7;
  if (ageDays > sla * 2) return "red";       // above twice the sla 
  if (ageDays > sla) return "orange";        // above the sla 
  if (ageDays >= sla * 0.5) return "yellow"; // above 50% from creating date
  return "green";                             // till 50% from the report create date
}


// SLA ימים לכל סוג דיווח
export const SLA_DAYS: Record<string, number> = {
  garbage: 5,
  lighting: 7,
  tree: 8,
};