// app/api/test-email/route.ts
import { NextResponse } from "next/server";
import { notifyGarbageAnomalyManagers } from "@/lib/server/email-service";
import { Anomaly } from "@/lib/server/anomalyDetector/builders";

export async function POST() {
  try {
    // Create a test anomaly
    const testAnomaly: Anomaly = {
      id: "test_anom_garbage_test_spike",
      category: "garbage",
      type: "spike",
      area: "Test Area",
      title: "בדיקת מערכת התראות מייל",
      description: "זוהי אנומליה לבדיקה בלבד של מערכת שליחת המיילים.",
      generalMessage: "זוהתה עלייה חדה בדיווחי garbage באזור Test Area (בדיקה).",
      metrics: {
        currentReports: 50,
        baselineMean: 25,
        threshold: 40,
        pctChange: 100,
        zScore: 3.0,
      },
      relatedReports: ["test1", "test2", "test3"],
      severity: "high",
      status: "open",
      firstDetected: Date.now(),
      lastUpdated: Date.now(),
      center: null,
    };

    console.log("🧪 API Test: Sending test email notification...");
    await notifyGarbageAnomalyManagers(testAnomaly);

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully. Check server console for details.",
      anomaly: testAnomaly,
    });
  } catch (error) {
    console.error("❌ API Test: Error sending test email:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
