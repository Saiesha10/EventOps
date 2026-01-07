import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

/* REQUIRED */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    // only send what UI needs
    const users = await User.find({}, "name role");

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("Fetch users failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
