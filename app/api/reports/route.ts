import { NextRequest, NextResponse } from "next/server";
import { db, adminFirestore } from "@/lib/server/firebase-admin";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Fetch all reports
export async function GET() {
  try {
    const snapshot = await db.ref("Reports").once("value");
    
    if (!snapshot.exists()) {
      return NextResponse.json(null);
    }

    const data = snapshot.val();

    // Filter out deleted reports
    Object.keys(data).forEach((type) => {
      if (data[type]) {
        const filteredGroup = Object.fromEntries(
          Object.entries(data[type]).filter(([, r]) => {
            const report = r as { deleted?: boolean };
            return !report.deleted;
          })
        );
        data[type] = filteredGroup;
      }
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

// PATCH - Update a report
export async function PATCH(req: NextRequest) {
  try {
    const { reportType, reportId, updates } = await req.json();

    if (!reportType || !reportId) {
      return NextResponse.json(
        { error: "Missing reportType or reportId" },
        { status: 400 }
      );
    }

    const path = `Reports/${reportType}/${reportId}`;
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
    const { reportType, reportId, deletedBy, hardDelete = false } = await req.json();

    if (!reportType || !reportId) {
      return NextResponse.json(
        { error: "Missing reportType or reportId" },
        { status: 400 }
      );
    }

    const path = `Reports/${reportType}/${reportId}`;
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
    const { action, reportType, reportId, userEmail, commentText } = await req.json();

    if (action !== "addComment") {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    if (!reportType || !reportId) {
      return NextResponse.json(
        { error: "Missing reportType or reportId" },
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

    const path = `Reports/${reportType}/${reportId}`;
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