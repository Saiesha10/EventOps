// app/api/map/users/route.ts
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await dbConnect();

    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/token=([^;]+)/);
    const token = match ? match[1] : null;
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Return all users with location (change filter as desired)
    const users = await User.find({}).select("-password").lean().exec();

    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
