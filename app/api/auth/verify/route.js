// app/api/auth/verify/route.js
import { NextResponse } from "next/server";
import { verifyAuth, refreshToken, getTokenFromRequest } from "@/lib/auth";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";

export async function GET(req) {
  try {
    // Connect to database
    await dbConnect();
    
    // Verify the user's authentication
    const auth = await verifyAuth(req);
    
    if (!auth) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Get the token from request
    const token = await getTokenFromRequest(req);

    if (token) {
      try {
        // Refresh the token if it exists
        const newToken = await refreshToken(token);
        
        // Update the cookie with the new token
        const cookieStore = await cookies();
        await cookieStore.set('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          path: '/'
        });
      } catch (error) {
        console.error("Error refreshing token:", error.message);
        // Continue with the current token
      }
    }

    // Get full user data from database
    const User = (await import("@/app/models/User")).default;
    const fullUser = await User.findById(auth.userId).select("-password").lean();
    
    if (!fullUser) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Return full user data
    return NextResponse.json({ 
      authenticated: true, 
      user: {
        _id: fullUser._id.toString(),
        userId: fullUser._id.toString(),
        name: fullUser.name,
        email: fullUser.email,
        role: fullUser.role,
        status: fullUser.status,
        studentId: fullUser.studentId,
        librarianId: fullUser.librarianId,
        department: fullUser.department,
        joinDate: fullUser.joinDate,
        booksBorrowed: fullUser.booksBorrowed,
        fines: fullUser.fines
      }
    });
  } catch (err) {
    console.error("Auth verification error:", err);
    return NextResponse.json({ authenticated: false, error: "Server error" }, { status: 500 });
  }
}
