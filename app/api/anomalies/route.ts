import { getAnomalies } from "@/lib/server/anomalies-service";

export async function GET() {
  const anomalies = await getAnomalies();
  return Response.json(anomalies);
}