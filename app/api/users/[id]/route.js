import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "../../../models/User";

export async function PUT(request) {
  try {
    // Extract and validate id from URL
    const segments = request.url.split('/');
    const id = segments[segments.length - 1];
    
    // Ensure id exists and is valid
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate if id is a valid MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    await dbConnect();

    // Find the user first to validate existence
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { name, department, currentPassword, newPassword, status, accessLevel, permissions } = await request.json();

    // Validate name if provided
    if (name !== undefined && name.trim() === '') {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    // Update basic information
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (status !== undefined) updateData.status = status;
    if (accessLevel !== undefined) updateData.accessLevel = accessLevel;
    if (permissions !== undefined) updateData.permissions = permissions;

    // Handle password change if provided
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to change password" }, { status: 400 });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedNewPassword;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    // Return updated user without password
    const { password: _, ...userWithoutPassword } = updatedUser.toObject();

    return NextResponse.json({
      message: "User updated successfully",
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    // Extract and validate id from URL
    const segments = request.url.split('/');
    const id = segments[segments.length - 1];
    
    // Ensure id exists and is valid
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate if id is a valid MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });

  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // Extract and validate id from URL
    const segments = request.url.split('/');
    const id = segments[segments.length - 1];
    
    // Ensure id exists and is valid
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate if id is a valid MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(id).select("-password");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    // Extract and validate id from URL
    const segments = request.url.split('/');
    const id = segments[segments.length - 1];
    
    // Ensure id exists and is valid
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate if id is a valid MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    const { action, ...data } = await request.json();
    
    await dbConnect();
    
    let updateData = {};
    
    if (action === "toggleStatus") {
      const user = await User.findById(id);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      updateData.status = user.status === "active" ? "suspended" : "active";
    } else if (action === "updatePassword") {
      const bcrypt = await import("bcryptjs");
      updateData.password = await bcrypt.hash(data.password, 10);
    } else {
      updateData = data;
    }
    
    const user = await User.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).select({ password: 0 });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: "User updated successfully",
      user
    });
  } catch (err) {
    console.error("Patch user error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
