import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ActivityLog from "../../models/ActivityLog";
import { verifyAuth } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    await dbConnect();

    const body = await req.json();
    const {
      action,
      details,
      role,
      actor,
      isPublicAction,
      entityType,
      entityId,
      entityName,
      userId,
    } = body;

    console.log("Activity POST request:", { action, isPublicAction, role });

    let auth = null;

    // Only verify auth for non-public actions
    if (!isPublicAction) {
      console.log("Not a public action, verifying auth...");
      auth = await verifyAuth(req);

      if (!auth) {
        console.log("Auth verification failed");
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      console.log("Auth verified:", auth);
    } else {
      console.log("Public action, skipping auth");
    }

    // Map action names to schema enums
    const actionTypeMap = {
      "New book added": "BOOK_ADDED",
      "Book removed": "BOOK_REMOVED",
      "Book updated": "BOOK_UPDATED",
      "User added": "USER_ADDED",
      "User removed": "USER_REMOVED",
      "User updated": "USER_UPDATED",
      "Book borrowed": "BOOK_BORROWED",
      "Book returned": "BOOK_RETURNED",
      "Loan renewed": "BOOK_BORROWED",
      user_signup: "USER_ADDED",
    };

    const mappedActionType = actionTypeMap[action] || action;

    // Ensure valid ObjectIds (only if provided)
    const performedByUserId = auth?.userId || userId;
    const validPerformedByUserId =
      performedByUserId && mongoose.Types.ObjectId.isValid(performedByUserId)
        ? new mongoose.Types.ObjectId(performedByUserId)
        : null;

    const validEntityId =
      entityId && mongoose.Types.ObjectId.isValid(entityId)
        ? new mongoose.Types.ObjectId(entityId)
        : null;

    // Ensure userRole is one of the valid enum values (including 'system' for public actions)
    const validUserRole = ["admin", "librarian", "student", "system"].includes(
      auth?.role || role
    )
      ? auth?.role || role
      : "system";

    // Create activity log entry with required fields
    const activityData = {
      actionType: mappedActionType,
      description: details,
      performedBy: {
        userName: auth?.name || actor || "system",
        userRole: validUserRole,
      },
      targetEntity: {
        entityType: entityType || "system",
        entityName: entityName || "System Activity",
      },
    };

    // Only add optional ObjectIds if they exist
    if (validPerformedByUserId) {
      activityData.performedBy.userId = validPerformedByUserId;
    }
    if (validEntityId) {
      activityData.targetEntity.entityId = validEntityId;
    }

    console.log(
      "Creating activity with data:",
      JSON.stringify(activityData, null, 2)
    );

    const activity = await ActivityLog.create(activityData);

    return NextResponse.json({
      success: true,
      activity: {
        id: activity._id,
        action: activity.actionType,
        details: activity.description,
        timestamp: activity.timestamp,
      },
    });
  } catch (err) {
    console.error("Create activity error:", err);
    console.error("Error details:", err.message);
    console.error("Error stack:", err.stack);

    // Handle mongoose validation errors
    if (err.name === "ValidationError") {
      const validationErrors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      }));
      console.error(
        "Validation errors:",
        JSON.stringify(validationErrors, null, 2)
      );
      return NextResponse.json(
        {
          error: "Validation error",
          details: validationErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", "),
          fields: validationErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Server error",
        details: err.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit")) || 50;
    const userRole = searchParams.get("role"); // admin, librarian, etc.
    const actionTypes = searchParams.get("actionTypes")?.split(",");

    // Verify authentication
    const auth = await verifyAuth(req);

    if (!auth) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin and librarian can view activities
    if (auth.role !== "admin" && auth.role !== "librarian") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Build query options
    const queryOptions = {
      limit,
      userRole,
      actionTypes,
    };

    const activities = await ActivityLog.getRecentActivities(queryOptions);

    // Format activities for display
    const formattedActivities = activities.map((activity) => ({
      id: activity._id,
      action: activity.actionType,
      performer: {
        name: activity.performedBy.userName,
        role: activity.performedBy.userRole,
      },
      target: {
        type: activity.targetEntity.entityType,
        name: activity.targetEntity.entityName,
      },
      description: activity.description,
      timestamp: activity.timestamp,
      timeAgo: new Date(activity.timestamp).toLocaleString(),
    }));

    return NextResponse.json({
      activities: formattedActivities,
      count: formattedActivities.length,
    });
  } catch (err) {
    console.error("Get activities error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
