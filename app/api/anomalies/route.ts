import { getAnomaliesFromDB } from "@/lib/server/anomalies-service";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const anomalies = await getAnomaliesFromDB();
  return Response.json(anomalies);
}