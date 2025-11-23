// app/api/map/update-location/route.ts
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Location from "@/models/Location";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { broadcastEvent } from "@/lib/sse";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookie = req.headers.get("cookie") || "";
    // extract token cookie (simple)
    const match = cookie.match(/token=([^;]+)/);
    const token = match ? match[1] : null;
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { lat, lng, accuracy } = body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 });
    }

    // Save Location
    const locDoc = await Location.create({
      user: decoded.id,
      loc: { type: "Point", coordinates: [lng, lat] },
      accuracy,
      recordedAt: new Date(),
    });

    // Update user doc
    const user = await User.findByIdAndUpdate(decoded.id, {
      location: { type: "Point", coordinates: [lng, lat] },
      lastSeenAt: new Date(),
      isActive: true,
    }, { new: true }).select("-password");

    // Broadcast to SSE clients
    broadcastEvent("location-update", { user });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    console.error("update-location error", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
