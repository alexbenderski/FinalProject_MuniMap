import { anomalyTemplates } from "./anomalyTemplates";
import { Anomaly } from "./builders";

export function generateAnomalyDescription(a: Anomaly) {
  const template = anomalyTemplates[a.type] || anomalyTemplates.custom;
  return template(a).trim();
}