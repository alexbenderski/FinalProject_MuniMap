import { NextRequest, NextResponse } from "next/server";
import { db, adminFirestore } from "@/lib/server/firebase-admin";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * New Path Structure: /Reports/ActiveReports/{city}/{reportType}/{reportId}
 */

// GET - Fetch all reports (supports optional city filter via query param)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityFilter = searchParams.get("city");

    // New structure: /Reports/ActiveReports/{city}/{type}/{id}
    const activeReportsRef = db.ref("Reports/ActiveReports");
    const snapshot = await activeReportsRef.once("value");
    
    if (!snapshot.exists()) {
      return NextResponse.json(null);
    }

    const rawData = snapshot.val();
    
    // Transform from {city: {type: {id: report}}} to {type: {id: report}} for backward compatibility
    // Also filter out deleted reports
    const result: Record<string, Record<string, unknown>> = {};

    Object.entries(rawData).forEach(([city, cityData]) => {
      // Apply city filter if provided
      if (cityFilter && city !== cityFilter) return;

      if (cityData && typeof cityData === "object") {
        Object.entries(cityData as Record<string, Record<string, unknown>>).forEach(([type, typeData]) => {
          if (!result[type]) {
            result[type] = {};
          }
          
          if (typeData && typeof typeData === "object") {
            Object.entries(typeData as Record<string, unknown>).forEach(([id, report]) => {
              const r = report as { deleted?: boolean; area?: string };
              if (!r.deleted) {
                result[type][id] = report;
              }
            });
          }
        });
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

// PATCH - Update a report
export async function PATCH(req: NextRequest) {
  try {
    const { reportType, reportId, city, updates } = await req.json();

    if (!reportType || !reportId || !city) {
      return NextResponse.json(
        { error: "Missing reportType, reportId, or city" },
        { status: 400 }
      );
    }

    // New path structure: /Reports/ActiveReports/{city}/{reportType}/{reportId}
    const path = `Reports/ActiveReports/${city}/${reportType}/${reportId}`;
    const nodeRef = db.ref(path);

    const snapshot = await nodeRef.once("value");
    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: `Report not found: ${path}` },
        { status: 404 }
      );
    }

    await nodeRef.update(updates);
    console.log("[API] Updated report:", path, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

// DELETE - Soft delete or hard delete a report
export async function DELETE(req: NextRequest) {
  try {
    const { reportType, reportId, city, deletedBy, hardDelete = false } = await req.json();

    if (!reportType || !reportId || !city) {
      return NextResponse.json(
        { error: "Missing reportType, reportId, or city" },
        { status: 400 }
      );
    }

    // New path structure: /Reports/ActiveReports/{city}/{reportType}/{reportId}
    const path = `Reports/ActiveReports/${city}/${reportType}/${reportId}`;
    const nodeRef = db.ref(path);

    const snapshot = await nodeRef.once("value");
    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: `Report not found: ${path}` },
        { status: 404 }
      );
    }

    if (hardDelete) {
      // Physical deletion
      await nodeRef.remove();
      console.log("[API] Hard deleted report:", path);
    } else {
      // Logical deletion (soft delete)
      const payload = {
        deleted: true,
        deletedAt: Date.now(),
        deletedBy: deletedBy || "unknown",
      };
      await nodeRef.update(payload);
      console.log("[API] Soft deleted report:", path, payload);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}

// POST - Add comment to report
export async function POST(req: NextRequest) {
  try {
    const { action, reportType, reportId, city, userEmail, commentText } = await req.json();

    if (action !== "addComment") {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    if (!reportType || !reportId || !city) {
      return NextResponse.json(
        { error: "Missing reportType, reportId, or city" },
        { status: 400 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing userEmail" },
        { status: 400 }
      );
    }

    if (!commentText || !commentText.trim()) {
      return NextResponse.json(
        { error: "Comment text cannot be empty" },
        { status: 400 }
      );
    }

    // Get user's authority from Firestore
    const safeKey = userEmail.replace(/\./g, "_");
    let authority = "Municipal Worker";
    
    try {
      const userDoc = await adminFirestore.collection("users").doc(safeKey).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        authority = userData?.authority || "Municipal Worker";
      }
    } catch (err) {
      console.warn("Could not fetch user authority:", err);
    }

    // New path structure: /Reports/ActiveReports/{city}/{reportType}/{reportId}
    const path = `Reports/ActiveReports/${city}/${reportType}/${reportId}`;
    const nodeRef = db.ref(path);

    const snapshot = await nodeRef.once("value");
    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: `Report not found: ${path}` },
        { status: 404 }
      );
    }

    // Get existing comments or initialize empty array
    const reportData = snapshot.val();
    const existingComments = reportData.comments || [];

    // Create new comment
    const newComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userName: authority,
      userEmail: userEmail,
      text: commentText.trim(),
      timestamp: Date.now()
    };

    // Add to existing comments
    const updatedComments = [...existingComments, newComment];

    // Update in database
    await nodeRef.update({ comments: updatedComments });
    console.log("[API] Added comment to report:", path, newComment);

    return NextResponse.json({ 
      success: true, 
      comment: newComment 
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}