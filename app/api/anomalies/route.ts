import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/firebase-admin";
import { Anomaly } from "@/lib/types";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Fetch all active anomalies
// New path: /Anomalies/Active/{city}/{anomalyId}
export async function GET() {
  try {
    const snapshot = await db.ref("Anomalies/Active").once("value");
    
    if (!snapshot.exists()) {
      return NextResponse.json([]);
    }

    const citiesData = snapshot.val();
    const anomalies: Anomaly[] = [];

    // Iterate through cities and collect all anomalies
    Object.values(citiesData).forEach((cityAnomalies: unknown) => {
      if (cityAnomalies && typeof cityAnomalies === 'object') {
        Object.entries(cityAnomalies).forEach(([firebaseKey, anomalyData]) => {
          anomalies.push({
            firebaseKey,
            ...(anomalyData as Omit<Anomaly, "firebaseKey">),
          });
        });
      }
    });

    // Sort by lastUpdated descending
    anomalies.sort((a, b) => b.lastUpdated - a.lastUpdated);

    return NextResponse.json(anomalies);
  } catch (error) {
    console.error("Error fetching anomalies:", error);
    return NextResponse.json({ error: "Failed to fetch anomalies" }, { status: 500 });
  }
}

// PATCH - Mark anomaly as reviewed
export async function PATCH(req: NextRequest) {
  try {
    const { firebaseKey, city, userEmail, alreadyReviewed, existingTimestamp } = await req.json();

    if (!firebaseKey || !city || !userEmail) {
      return NextResponse.json(
        { error: "Missing firebaseKey, city, or userEmail" },
        { status: 400 }
      );
    }

    // Check if already reviewed (passed from client)
    if (alreadyReviewed && existingTimestamp) {
      return NextResponse.json({
        alreadyReviewed: true,
        email: userEmail,
        timestamp: existingTimestamp
      });
    }

    const safeKey = userEmail.replace(/\./g, "_");
    const anomalyPath = `Anomalies/Active/${city}/${firebaseKey}`;
    const nodeRef = db.ref(anomalyPath);

    const snapshot = await nodeRef.once("value");
    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: `Anomaly not found: ${anomalyPath}` },
        { status: 404 }
      );
    }

    const timestamp = Date.now();
    
    await nodeRef.child("reviewedBy").child(safeKey).set(timestamp);

    console.log("[API] Marked anomaly as reviewed:", anomalyPath, userEmail);

    return NextResponse.json({
      alreadyReviewed: false,
      email: userEmail,
      timestamp
    });
  } catch (error) {
    console.error("Error marking anomaly as reviewed:", error);
    return NextResponse.json({ error: "Failed to mark anomaly as reviewed" }, { status: 500 });
  }
}

// POST - Add comment to anomaly
export async function POST(req: NextRequest) {
  try {
    const { firebaseKey, city, userEmail, commentText } = await req.json();

    if (!firebaseKey || !city || !userEmail || !commentText) {
      return NextResponse.json(
        { error: "Missing firebaseKey, city, userEmail, or commentText" },
        { status: 400 }
      );
    }

    const anomalyPath = `Anomalies/Active/${city}/${firebaseKey}`;
    const nodeRef = db.ref(anomalyPath);

    const snapshot = await nodeRef.once("value");
    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: `Anomaly not found: ${anomalyPath}` },
        { status: 404 }
      );
    }

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    const newComment = {
      id: commentId,
      userEmail: userEmail,
      text: commentText,
      timestamp: timestamp
    };

    // Push new comment to the comments array
    await nodeRef.child("comments").child(commentId).set(newComment);

    console.log("[API] Added comment to anomaly:", anomalyPath, userEmail);

    return NextResponse.json({
      success: true,
      comment: newComment
    });
  } catch (error) {
    console.error("Error adding comment to anomaly:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}