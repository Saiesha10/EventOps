import { NextResponse } from "next/server";
import { getAuthCookie } from "@/lib/cookies";
import { verifyToken } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function GET() {
  await dbConnect();

  const token = getAuthCookie();
  if (!token)
    return NextResponse.json({ user: null }, { status: 200 });

  const decoded: any = verifyToken(token);
  if (!decoded)
    return NextResponse.json({ user: null }, { status: 200 });

  const user = await User.findById(decoded.id);
  return NextResponse.json({ user });
}
