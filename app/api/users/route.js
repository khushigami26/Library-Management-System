import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "../../models/User";
import ActivityLog from "../../models/ActivityLog";
import { generateStudentId } from "@/lib/studentIdGenerator";
import { validateEmail, validatePassword } from "@/lib/validation";
import jwt from "jsonwebtoken";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    
    await dbConnect();
    
    let query = {};
    if (role) {
      query.role = role;
    }
    
    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    await dbConnect();
    
    // Get the user info before deleting for logging
    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Get current user from token for logging
    let currentUser = null;
    try {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split(' ')[1] || req.headers.get('cookie')?.split('token=')[1]?.split(';')[0];
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUser = await User.findById(decoded.id).select('_id name role');
      }
    } catch (error) {
      console.log('Could not get current user for logging:', error.message);
    }
    
    // Delete the user
    await User.findByIdAndDelete(id);
    
    // Log the activity if we have current user info
    if (currentUser) {
      try {
        await ActivityLog.logActivity({
          actionType: 'USER_REMOVED',
          performedBy: {
            userId: currentUser._id,
            userName: currentUser.name,
            userRole: currentUser.role
          },
          targetEntity: {
            entityType: 'user',
            entityId: userToDelete._id,
            entityName: userToDelete.name,
            additionalData: {
              email: userToDelete.email,
              role: userToDelete.role,
              studentId: userToDelete.studentId
            }
          }
        });
      } catch (logError) {
        console.error('Error logging user deletion activity:', logError);
        // Don't fail the main operation if logging fails
      }
    }
    
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, email, password, role, studentId, department, permissions, accessLevel } = await req.json();
    
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password, and role are required" }, { status: 400 });
    }

    // Validate name
    if (name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters long" }, { status: 400 });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json({ error: emailValidation.errors[0] }, { status: 400 });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({ error: passwordValidation.errors[0] }, { status: 400 });
    }

    // Validate role
    if (!['student', 'librarian', 'admin'].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    await dbConnect();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Auto-generate student ID for students
    let generatedStudentId = undefined;
    if (role === "student") {
      generatedStudentId = await generateStudentId();
    }

    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      studentId: generatedStudentId,
      department: department || undefined,
      permissions: permissions || [],
      accessLevel: accessLevel || "standard",
      joinDate: new Date(),
      status: "active"
    };

    const user = await User.create(userData);

    // Get current user from token for logging
    let currentUser = null;
    try {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split(' ')[1] || req.headers.get('cookie')?.split('token=')[1]?.split(';')[0];
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUser = await User.findById(decoded.id).select('_id name role');
      }
    } catch (error) {
      console.log('Could not get current user for logging:', error.message);
    }

    // Log the activity if we have current user info
    if (currentUser) {
      try {
        await ActivityLog.logActivity({
          actionType: 'USER_ADDED',
          performedBy: {
            userId: currentUser._id,
            userName: currentUser.name,
            userRole: currentUser.role
          },
          targetEntity: {
            entityType: 'user',
            entityId: user._id,
            entityName: user.name,
            additionalData: {
              email: user.email,
              role: user.role,
              studentId: user.studentId,
              department: user.department
            }
          }
        });
      } catch (logError) {
        console.error('Error logging user creation activity:', logError);
        // Don't fail the main operation if logging fails
      }
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    
    return NextResponse.json({ 
      message: "User created successfully",
      user: userWithoutPassword
    }, { status: 201 });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
