import { getAnomaliesFromDB } from "@/lib/server/anomalies-service";

export async function GET() {
  const anomalies = await getAnomaliesFromDB();
  return Response.json(anomalies);
}