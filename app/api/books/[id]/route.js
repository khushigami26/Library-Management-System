import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Book from "../../../models/Book";
import ActivityLog from "../../../models/ActivityLog";
import User from "../../../models/User";
import jwt from "jsonwebtoken";

export async function PUT(req, { params }) {
  try {
    // Wait for params to be available and validate ID
    const id = await params.id;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    const updateData = await req.json();

    await dbConnect();

    const book = await Book.findByIdAndUpdate(
      id,
      { ...updateData, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Book updated successfully",
      book,
    });
  } catch (err) {
    console.error("Update book error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    // Wait for params to be available and validate ID
    const id = await params.id;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    await dbConnect();

    // Get the book info before deleting for logging
    const bookToDelete = await Book.findById(id);
    if (!bookToDelete) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Get current user from token for logging
    let currentUser = null;
    try {
      const authHeader = req.headers.get("authorization");
      const token =
        authHeader?.split(" ")[1] ||
        req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUser = await User.findById(decoded.id).select("_id name role");
      }
    } catch (error) {
      console.log("Could not get current user for logging:", error.message);
    }

    // Delete the book
    await Book.findByIdAndDelete(id);

    // Log the activity if we have current user info
    if (currentUser) {
      try {
        await ActivityLog.logActivity({
          actionType: "BOOK_REMOVED",
          performedBy: {
            userId: currentUser._id,
            userName: currentUser.name,
            userRole: currentUser.role,
          },
          targetEntity: {
            entityType: "book",
            entityId: bookToDelete._id,
            entityName: bookToDelete.title,
            additionalData: {
              author: bookToDelete.author,
              isbn: bookToDelete.isbn,
              category: bookToDelete.category,
              totalCopies: bookToDelete.totalCopies,
            },
          },
        });
      } catch (logError) {
        console.error("Error logging book deletion activity:", logError);
        // Don't fail the main operation if logging fails
      }
    }

    return NextResponse.json({
      message: "Book deleted successfully",
    });
  } catch (err) {
    console.error("Delete book error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    // Wait for params to be available and validate ID
    const id = await params.id;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    const { action, ...data } = await req.json();

    await dbConnect();

    let updateData = {};

    if (action === "borrow") {
      const book = await Book.findById(id);
      if (!book) {
        return NextResponse.json({ error: "Book not found" }, { status: 404 });
      }
      if (book.availableCopies <= 0) {
        return NextResponse.json(
          { error: "No copies available" },
          { status: 400 }
        );
      }
      updateData.availableCopies = book.availableCopies - 1;
      if (updateData.availableCopies === 0) {
        updateData.status = "borrowed";
      }
    } else if (action === "return") {
      const book = await Book.findById(id);
      if (!book) {
        return NextResponse.json({ error: "Book not found" }, { status: 404 });
      }
      updateData.availableCopies = book.availableCopies + 1;
      if (updateData.availableCopies > 0) {
        updateData.status = "available";
      }
    } else {
      updateData = data;
    }

    updateData.lastUpdated = new Date();

    const book = await Book.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Book updated successfully",
      book,
    });
  } catch (err) {
    console.error("Patch book error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
