import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const { name, email, password, phone, avatarUrl, role, currentStatus, location } = body;

    // check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      avatarUrl,
      role,
      currentStatus,
      location,
      lastSeenAt: new Date(),
      points: 0,
      badges: [],
      isActive: false,
    });

    return NextResponse.json(
      { message: "User registered", user: newUser },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message },
      { status: 500 }
    );
  }
}
