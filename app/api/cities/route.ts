import { getCities } from "@/lib/server/cities-service";

export async function GET() {
  const cities = await getCities();
  return Response.json(cities);
}