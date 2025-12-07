import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SystemSettings from "@/app/models/SystemSettings";

export async function GET() {
  try {
    await dbConnect();
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    }
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    await dbConnect();

    const update = {
      ...(body.libraryName !== undefined && { libraryName: body.libraryName }),
      ...(body.maxBooksPerUser !== undefined && { maxBooksPerUser: Number(body.maxBooksPerUser) }),
      ...(body.loanPeriodDays !== undefined && { loanPeriodDays: Number(body.loanPeriodDays) }),
      ...(body.sessionTimeoutMinutes !== undefined && { sessionTimeoutMinutes: Number(body.sessionTimeoutMinutes) }),
      ...(body.passwordPolicy && { passwordPolicy: body.passwordPolicy }),
      ...(body.twoFactorAuthMode && { twoFactorAuthMode: body.twoFactorAuthMode }),
    };

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      update,
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Error updating system settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}


