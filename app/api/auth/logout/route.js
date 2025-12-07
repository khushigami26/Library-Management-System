// app/api/auth/logout/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // Clear the authentication cookie
    const cookieStore = await cookies();
    cookieStore.delete('token');
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
