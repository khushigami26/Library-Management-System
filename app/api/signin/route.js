// app/api/signin/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "../../models/User";
import { validateEmail } from "@/lib/validation";
import { generateToken } from "@/lib/auth";
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    // Update last active
    await User.findByIdAndUpdate(user._id, { lastActive: new Date() });

    // Generate JWT token
    const token = generateToken(user);

    // Set cookie with the token
    const cookieStore = await cookies();
    await cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    
    return NextResponse.json({ 
      message: "Login successful",
      user: userWithoutPassword,
      token  // Include token in response
    });
  } catch (err) {
    console.error("Signin error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
