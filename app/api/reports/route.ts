import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  // Reports are fetched client-side from Firebase Realtime DB
  return NextResponse.json([]);
}