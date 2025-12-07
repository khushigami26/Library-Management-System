import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  return NextResponse.json({
    success: false,
    error: "This endpoint is not implemented yet"
  }, { status: 501 });
}

export async function POST(request, { params }) {
  return NextResponse.json({
    success: false,
    error: "This endpoint is not implemented yet"
  }, { status: 501 });
}

export async function PUT(request, { params }) {
  return NextResponse.json({
    success: false,
    error: "This endpoint is not implemented yet"
  }, { status: 501 });
}

export async function DELETE(request, { params }) {
  return NextResponse.json({
    success: false,
    error: "This endpoint is not implemented yet"
  }, { status: 501 });
}