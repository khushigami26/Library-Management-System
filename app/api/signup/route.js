// app/api/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "../../models/User";
import { generateStudentId, generateLibrarianId } from "@/lib/studentIdGenerator";
import { validateEmail, validatePassword } from "@/lib/validation";

export async function POST(req) {
  try {
    const { name, email, password, role, studentId, department, adminSecretKey } = await req.json();
    
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password, and role are required" }, { status: 400 });
    }

    // Check admin secret key if role is admin
    if (role === 'admin') {
      if (!adminSecretKey) {
        return NextResponse.json({ error: "Admin secret key is required for admin registration" }, { status: 400 });
      }
      
      const storedSecretKey = process.env.ADMIN_SECRET_KEY;
      if (!storedSecretKey) {
        console.error("ADMIN_SECRET_KEY not configured in environment variables");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }

      if (adminSecretKey !== storedSecretKey) {
        return NextResponse.json({ error: "Invalid admin secret key" }, { status: 401 });
      }
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

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Auto-generate IDs based on role
    let generatedStudentId = undefined;
    let generatedLibrarianId = undefined;
    
    if (role === "student") {
      generatedStudentId = await generateStudentId();
    } else if (role === "librarian") {
      generatedLibrarianId = await generateLibrarianId();
    }

    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      studentId: generatedStudentId,
      librarianId: generatedLibrarianId,
      department: department || undefined,
      joinDate: new Date(),
      status: "active"
    };

    const user = await User.create(userData);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    
    return NextResponse.json({ 
      message: "User created successfully",
      user: userWithoutPassword
    }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
