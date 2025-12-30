import { NextResponse } from "next/server";

export async function GET() {
  // Return empty array or static data since cities are loaded from JSON file on client side
  return NextResponse.json([]);
}