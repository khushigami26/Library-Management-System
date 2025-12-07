import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "../../models/Notification";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit')) || 50;
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await dbConnect();
    
    let query = { userId };
    if (unreadOnly) {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("Get notifications error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { 
      userId, 
      type, 
      title, 
      message, 
      bookId, 
      bookTitle, 
      dueDate, 
      fineAmount, 
      priority, 
      actionRequired, 
      actionUrl, 
      expiresAt 
    } = await req.json();
    
    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: "User ID, type, title, and message are required" }, { status: 400 });
    }

    await dbConnect();
    
    const notificationData = {
      userId,
      type,
      title,
      message,
      bookId: bookId || undefined,
      bookTitle: bookTitle || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      fineAmount: fineAmount || 0,
      priority: priority || "medium",
      actionRequired: actionRequired || false,
      actionUrl: actionUrl || undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    };

    const notification = await Notification.create(notificationData);
    
    return NextResponse.json({ 
      message: "Notification created successfully",
      notification
    }, { status: 201 });
  } catch (err) {
    console.error("Create notification error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { notificationId, action, userId } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    await dbConnect();

    if (action === "markAllAsRead") {
      if (!userId) {
        return NextResponse.json({ error: "User ID required for markAllAsRead" }, { status: 400 });
      }

      await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );

      return NextResponse.json({
        message: "All notifications marked as read"
      });
    }

    if (action === "markAsRead") {
      if (!notificationId) {
        return NextResponse.json({ error: "Notification ID required for markAsRead" }, { status: 400 });
      }

      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      return NextResponse.json({
        message: "Notification updated successfully",
        notification
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    console.error("Update notification error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
